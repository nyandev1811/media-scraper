export const GET_HISTORY_DOCS = {
  summary: 'Fetch User Activity History',
  description: `
Retrieves the most recent scraping activities for a specific Guest Session.

### 📋 Usage
- Frontend calls this to display the "Recent Scrapes" list.
- **Persistence**: Linked to the browser's \`sessionId\` (uuid). 
- **Retention**: Returns the last 50 activities.

### 🔗 Relationships
Each history item links to the Source URL and summary counts (e.g., "Google: 20 images found").
  `,
};
