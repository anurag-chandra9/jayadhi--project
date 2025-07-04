-How to Simulate

- 1.Install dependencies
terminal-
    npm install

- 2.Start the server
terminal
    node server.js

Change the port in server.js if needed.


- 3.Set up example enterprise server
Run your enterprise app on port 5000 or 5001 for testing.

Example:
const targets = {
    'xyz.com': 'http://192.168.1.100:5000',
    'abc.com': 'http://192.168.1.101:5000',
    'localhost': 'http://localhost:5000', //Example Enterprise website 1
    '127.0.0.1': 'http://localhost:5001'  //Example Enterprise website 2
};


- 4.Start Enterprise server:
(same for both)
terminal-
    node server.js


- 5.Access via browser:
**(now use waf proxy server port to access)
To hit Enterprise website 1 through the WAF:
Go to:
    http://localhost:8080/

To hit Enterprise website 1 through the WAF:
Go to:
    http://127.0.0.1:8080/


- 6.Testing the WAF

Perform test attacks to see logs:

http://localhost:8080/?file=../../etc/passwd

http://127.0.0.1:8080/?user=' OR 1=1 --


- 7.View attack logs
Access:

http://localhost:8080/logs     (we apply authentication on this route in future)

or check:

logs/attacks.log

- to see attack details with target and source IP.

* What this proxy detects

- SQL Injection (OR 1=1, UNION SELECT, etc.)
- XSS (<script>, javascript:)
- PHP Injection (<?php, eval()
- Directory Traversal (../)
- Malicious User-Agents (sqlmap, nmap)
- DDoS / Brute Force (via rate limiting)


* When detected, it will:

- Block the IP automatically
- Log the attack
- Send alert emails to our client

