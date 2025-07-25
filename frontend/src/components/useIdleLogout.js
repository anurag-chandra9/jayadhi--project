// src/hooks/useIdleLogout.js
import { useEffect } from 'react';
import { authService } from '../firebase/firebase';

const useIdleLogout = (timeout = 10 * 60 * 1000) => {
  useEffect(() => {
    let logoutTimer;
    let warningTimer;

    const resetTimers = () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);

      // Show warning 1 min before actual logout
      warningTimer = setTimeout(() => {
        const confirmStay = window.confirm("You're inactive. Still there?");
        if (!confirmStay) {
          authService.logout().then(() => {
            window.location.href = '/login';
          });
        }
      }, timeout - 60 * 1000);

      logoutTimer = setTimeout(() => {
        authService.logout().then(() => {
          window.location.href = '/login';
        });
      }, timeout);
    };

    // Events that reset the timer
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimers));

    resetTimers(); 

    return () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      events.forEach(event => window.removeEventListener(event, resetTimers));
    };
  }, [timeout]);
};

export default useIdleLogout;