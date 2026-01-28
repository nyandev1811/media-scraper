import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'media_scraper_session_id';

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};
