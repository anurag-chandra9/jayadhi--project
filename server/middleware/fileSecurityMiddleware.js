const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { WAFCore, WAFLogger } = require('./firewallMiddleware');
const { sendAlert } = require('./wafAlerts');

// Configuration
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const QUARANTINE_DIR = path.join(__dirname, '../quarantine');
const SECURE_DIR = path.join(__dirname, '../secure');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (!process.env.FILE_ENCRYPTION_KEY) {
  throw new Error('FILE_ENCRYPTION_KEY is not set in environment variables');
}
const ENCRYPTION_KEY = Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex');

const IV_LENGTH = 16; // For AES, this is always 16

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/json': ['.json'],
    'text/csv': ['.csv'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'application/rtf': ['.rtf'],
    'video/mp4': ['.mp4'],
    'video/avi': ['.avi'],
    'video/quicktime': ['.mov'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'application/octet-stream': ['.bin', '.dat'] // For legitimate binary files
};

// Malicious file patterns (simplified virus scanner)
const MALICIOUS_PATTERNS = [
    // Only target actual executable signatures and dangerous scripts
    Buffer.from([0x4D, 0x5A, 0x90, 0x00]), // More specific PE signature
    Buffer.from('#!/bin/sh\n'),
    Buffer.from('#!/bin/bash\n'),
    Buffer.from('<?php\n'),
    Buffer.from('<script>'),
    Buffer.from('<script '),
    Buffer.from('javascript:void'),
    Buffer.from('vbscript:'),
    Buffer.from('data:text/html,'),
    // Only dangerous eval patterns
    Buffer.from('eval(unescape('),
    Buffer.from('eval(String.fromCharCode('),
    Buffer.from('exec("'),
    Buffer.from("exec('"),
    Buffer.from('system("'),
    Buffer.from("system('"),
    Buffer.from('shell_exec("'),
    Buffer.from("shell_exec('"),
];

// Suspicious file names
const SUSPICIOUS_NAMES = [
    /\.(exe|bat|cmd|scr|vbs|com|pif)$/i,
    /\.(sh|bash)$/i,
    /^autorun\.inf$/i,
    /^desktop\.ini$/i,
    /\.(asp|aspx|php|jsp)$/i,
    /^\.htaccess$/i,
    /^\.htpasswd$/i,
];

class FileSecurityScanner {
    static async ensureDirectories() {
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
            await fs.mkdir(QUARANTINE_DIR, { recursive: true });
            await fs.mkdir(SECURE_DIR, { recursive: true });
        } catch (error) {
            WAFLogger.error('Error creating directories', { error: error.message });
        }
    }

    static async scanFile(filePath, originalName, mimeType, userIP, req) {
        const scanResult = {
            safe: false,
            threat: null,
            action: null,
            secureFilePath: null,
            quarantineReason: null
        };

        try {
            // 1. Check file name for suspicious patterns
            const nameCheck = this.checkFileName(originalName);
            if (!nameCheck.safe) {
                scanResult.threat = 'suspicious_filename';
                scanResult.quarantineReason = nameCheck.reason;
                await this.quarantineFile(filePath, originalName, scanResult.quarantineReason, userIP, req);
                return scanResult;
            }

            // 2. Check MIME type
            const mimeCheck = this.checkMimeType(mimeType, originalName);
            if (!mimeCheck.safe) {
                scanResult.threat = 'invalid_mime_type';
                scanResult.quarantineReason = mimeCheck.reason;
                await this.quarantineFile(filePath, originalName, scanResult.quarantineReason, userIP, req);
                return scanResult;
            }

            // 3. Scan file content for malicious patterns
            const contentCheck = await this.scanFileContent(filePath);
            if (!contentCheck.safe) {
                scanResult.threat = 'malicious_content';
                scanResult.quarantineReason = contentCheck.reason;
                await this.quarantineFile(filePath, originalName, scanResult.quarantineReason, userIP, req);
                return scanResult;
            }

            // 4. Check file size
            const stats = await fs.stat(filePath);
            if (stats.size > MAX_FILE_SIZE) {
                scanResult.threat = 'file_too_large';
                scanResult.quarantineReason = `File size ${stats.size} exceeds maximum allowed ${MAX_FILE_SIZE}`;
                await this.quarantineFile(filePath, originalName, scanResult.quarantineReason, userIP, req);
                return scanResult;
            }

            // File is safe - encrypt and store
            const secureFilePath = await this.encryptAndStore(filePath, originalName);
            scanResult.safe = true;
            scanResult.action = 'encrypted_and_stored';
            scanResult.secureFilePath = secureFilePath;

            WAFLogger.info('File scan completed - SAFE', {
                originalName,
                mimeType,
                fileSize: stats.size,
                userIP,
                secureFilePath
            });

            return scanResult;

        } catch (error) {
            WAFLogger.error('Error scanning file', {
                originalName,
                error: error.message,
                userIP
            });

            scanResult.threat = 'scan_error';
            scanResult.quarantineReason = `Scan error: ${error.message}`;
            await this.quarantineFile(filePath, originalName, scanResult.quarantineReason, userIP, req);
            return scanResult;
        }
    }

    static checkFileName(fileName) {
        // Check for suspicious file names
        for (const pattern of SUSPICIOUS_NAMES) {
            if (pattern.test(fileName)) {
                return {
                    safe: false,
                    reason: `Suspicious file name pattern: ${fileName}`
                };
            }
        }

        // Check for double extensions
        const suspiciousDoubleExt = /\.(pdf|doc|docx|jpg|png|txt)\.(exe|bat|cmd|scr|vbs|com|pif)$/i;
        if (suspiciousDoubleExt.test(fileName)) {
            return {
                safe: false,
                reason: `Suspicious double extension: ${fileName}`
            };
        }

        // Check for hidden files or system files
        if (fileName.includes('..')) {
            return {
                safe: false,
                reason: `Path traversal detected in file name: ${fileName}`
            };
        }

        return { safe: true };
    }

    static checkMimeType(mimeType, fileName) {
        // Check if MIME type is allowed
        if (!ALLOWED_FILE_TYPES[mimeType]) {
            // Allow application/octet-stream for certain safe extensions
            if (mimeType === 'application/octet-stream') {
                const fileExt = path.extname(fileName).toLowerCase();
                const safeOctetExtensions = ['.pdf', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx'];
                if (safeOctetExtensions.includes(fileExt)) {
                    return { safe: true };
                }
            }

            return {
                safe: false,
                reason: `MIME type not allowed: ${mimeType}`
            };
        }

        // More flexible extension checking for PDFs and Office docs
        const fileExt = path.extname(fileName).toLowerCase();
        const allowedExtensions = ALLOWED_FILE_TYPES[mimeType];

        if (!allowedExtensions.includes(fileExt)) {
            // Special case for PDFs that might have octet-stream MIME type
            if ((mimeType === 'application/pdf' || mimeType === 'application/octet-stream') && fileExt === '.pdf') {
                return { safe: true };
            }

            return {
                safe: false,
                reason: `File extension ${fileExt} doesn't match MIME type ${mimeType}`
            };
        }

        return { safe: true };
    }

    static async scanFileContent(filePath) {
        try {
            const fileBuffer = await fs.readFile(filePath);

            // Check for malicious patterns in file content
            for (const pattern of MALICIOUS_PATTERNS) {
                if (fileBuffer.includes(pattern)) {
                    return {
                        safe: false,
                        reason: `Malicious pattern detected in file content`
                    };
                }
            }

            // Check for embedded executables (ZIP bomb protection)
            if (this.detectZipBomb(fileBuffer)) {
                return {
                    safe: false,
                    reason: 'Potential ZIP bomb or suspicious archive structure'
                };
            }

            return { safe: true };
        } catch (error) {
            throw new Error(`Content scan failed: ${error.message}`);
        }
    }

    static detectZipBomb(buffer) {
        // More sophisticated ZIP bomb detection
        const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
        const rarSignature = Buffer.from([0x52, 0x61, 0x72, 0x21]);

        if (buffer.includes(zipSignature) || buffer.includes(rarSignature)) {
            // Only flag if extremely suspicious (very small archive claiming large content)
            if (buffer.length < 100) { // Changed from 1000 to 100
                return true;
            }

            // Check for nested archive bombs (multiple archive signatures)
            let zipCount = 0;
            let offset = 0;
            while ((offset = buffer.indexOf(zipSignature, offset)) !== -1) {
                zipCount++;
                offset += 4;
                if (zipCount > 100) return true; // Suspicious nesting
            }
        }

        return false;
    }

    static async encryptAndStore(filePath, originalName) {
        try {
            const fileBuffer = await fs.readFile(filePath);

            // Ensure ENCRYPTION_KEY is the right length
            let key = ENCRYPTION_KEY;
            if (typeof key === 'string') {
                key = Buffer.from(key, 'hex');
            }
            if (key.length !== 32) {
                throw new Error('Invalid encryption key length. Must be 32 bytes for AES-256.');
            }

            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

            let encrypted = cipher.update(fileBuffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            // Store IV + encrypted data
            const encryptedData = Buffer.concat([iv, encrypted]);

            // Generate secure filename
            const timestamp = Date.now();
            const hash = crypto.createHash('sha256').update(originalName + timestamp).digest('hex').substring(0, 16);
            const secureFileName = `${hash}_${timestamp}.enc`;
            const secureFilePath = path.join(SECURE_DIR, secureFileName);

            await fs.writeFile(secureFilePath, encryptedData);

            // Clean up original file
            await fs.unlink(filePath);

            WAFLogger.info('File encrypted and stored securely', {
                originalName,
                secureFileName,
                fileSize: fileBuffer.length
            });

            return secureFileName;
        } catch (error) {
            WAFLogger.error('Encryption error details', {
                originalName,
                error: error.message,
                keyType: typeof ENCRYPTION_KEY,
                keyLength: ENCRYPTION_KEY?.length
            });
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    static async quarantineFile(filePath, originalName, reason, userIP, req) {
        try {
            const timestamp = Date.now();
            const hash = crypto.createHash('sha256').update(originalName + timestamp).digest('hex').substring(0, 16);
            const quarantineFileName = `${hash}_${timestamp}_${originalName}`;
            const quarantinePath = path.join(QUARANTINE_DIR, quarantineFileName);

            // Move file to quarantine
            await fs.rename(filePath, quarantinePath);

            // Block user access
            await this.blockUserAccess(userIP, reason, req);

            // Log quarantine event
            await WAFCore.logSecurityEvent({
                ipAddress: userIP,
                eventType: 'file_quarantined',
                severity: 'high',
                description: `Malicious file quarantined: ${reason}`,
                userAgent: req.headers['user-agent'],
                requestUrl: req.originalUrl,
                requestMethod: req.method,
                quarantinedFile: originalName,
                quarantinePath: quarantineFileName,
                blocked: true
            });

            WAFLogger.critical('File quarantined and user blocked', {
                originalName,
                quarantineFileName,
                reason,
                userIP,
                origin: req.headers.origin
            });

            // Send security alert
            await sendAlert('malicious_file_upload', {
                ipAddress: userIP,
                fileName: originalName,
                reason,
                quarantinePath: quarantineFileName,
                origin: req.headers.origin,
                userAgent: req.headers['user-agent']
            });

        } catch (error) {
            WAFLogger.error('Error quarantining file', {
                originalName,
                reason,
                userIP,
                error: error.message
            });
        }
    }

    static async blockUserAccess(userIP, reason, req) {
        try {
            // Generate blocking key (consistent with WAF)
            const blockingKey = WAFCore.generateBlockingKey(userIP, req);

            // Block for 24 hours for malicious file uploads
            await WAFCore.blockIP(blockingKey, `malicious_file_upload: ${reason}`, {
                duration: 24 * 60 * 60 * 1000, // 24 hours
                userAgent: req.headers['user-agent'],
                isTemporary: true
            });

            WAFLogger.critical('User blocked for malicious file upload', {
                userIP,
                blockingKey,
                reason,
                blockDuration: '24 hours',
                origin: req.headers.origin
            });

        } catch (error) {
            WAFLogger.error('Error blocking user access', {
                userIP,
                reason,
                error: error.message
            });
        }
    }

    static async decryptFile(encryptedFileName) {
        try {
            const encryptedFilePath = path.join(SECURE_DIR, encryptedFileName);
            const encryptedData = await fs.readFile(encryptedFilePath);

            // Ensure ENCRYPTION_KEY is the right length
            let key = ENCRYPTION_KEY;
            if (typeof key === 'string') {
                key = Buffer.from(key, 'hex');
            }
            if (key.length !== 32) {
                throw new Error('Invalid encryption key length. Must be 32 bytes for AES-256.');
            }

            // Extract IV and encrypted content
            const iv = encryptedData.slice(0, IV_LENGTH);
            const encrypted = encryptedData.slice(IV_LENGTH);

            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    static getViewableFileTypes() {
        return [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'text/plain',
            'application/pdf',
            'text/csv',
            'application/json',
            'application/xml',
            'text/xml'
        ];
    }

    static isViewableFile(mimeType) {
        return this.getViewableFileTypes().includes(mimeType);
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await FileSecurityScanner.ensureDirectories();
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate temporary filename for scanning
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        cb(null, `temp_${timestamp}_${random}_${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Basic file filter - detailed checking happens in scanner
    if (!file.originalname || file.originalname.length > 255) {
        return cb(new Error('Invalid file name'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Allow only one file per request
    }
});

// Enhanced middleware function with better error handling
const fileSecurityMiddleware = (req, res, next) => {
    console.log('🔧 File security middleware invoked');
    console.log('📋 Content-Type:', req.headers['content-type']);
    console.log('🛣️ Path:', req.path);
    console.log('🔧 Method:', req.method);

    // Use multer to handle the multipart parsing
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('❌ Multer error:', err.message);
            WAFLogger.warn('File upload middleware error', {
                error: err.message,
                userIP: req.ip,
                origin: req.headers.origin
            });

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        error: 'File too large',
                        message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                    });
                }
                return res.status(400).json({
                    error: 'Upload error',
                    message: err.message
                });
            }

            return res.status(400).json({
                error: 'File upload failed',
                message: err.message
            });
        }

        console.log('✅ Multer processing completed');
        console.log('📄 File:', req.file ? 'Present' : 'Not present');
        console.log('📝 Body keys:', req.body ? Object.keys(req.body) : 'No body');

        // If no file uploaded, continue
        if (!req.file) {
            console.log('ℹ️ No file uploaded, continuing...');
            return next();
        }

        try {
            const userIP = WAFCore.normalizeIP(
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                req.ip ||
                'unknown'
            );

            console.log('🔍 Starting file scan...');

            // Scan the uploaded file
            const scanResult = await FileSecurityScanner.scanFile(
                req.file.path,
                req.file.originalname,
                req.file.mimetype,
                userIP,
                req
            );

            if (!scanResult.safe) {
                console.error('⚠️ File scan failed:', scanResult.quarantineReason);
                // File is malicious - user has been blocked
                return res.status(403).json({
                    error: 'Malicious file detected',
                    message: 'File has been quarantined and your access has been temporarily blocked for security reasons.',
                    type: 'malicious_file',
                    reason: scanResult.quarantineReason
                });
            }

            console.log('✅ File scan passed, attaching to request');

            // File is safe - attach scan result to request
            req.fileScanResult = scanResult;
            req.secureFile = {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                secureFileName: scanResult.secureFilePath,
                isViewable: FileSecurityScanner.isViewableFile(req.file.mimetype)
            };

            next();

        } catch (error) {
            console.error('❌ File security middleware error:', error.message);
            WAFLogger.error('File security middleware error', {
                error: error.message,
                fileName: req.file?.originalname,
                userIP: req.ip
            });

            // Clean up file on error
            if (req.file?.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkError) {
                    WAFLogger.error('Error cleaning up file', { error: unlinkError.message });
                }
            }

            return res.status(500).json({
                error: 'File processing failed',
                message: 'Unable to process uploaded file. Please try again.'
            });
        }
    });
};

// Initialize directories on module load
FileSecurityScanner.ensureDirectories();

module.exports = {
    fileSecurityMiddleware,
    FileSecurityScanner,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};