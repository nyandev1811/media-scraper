export const GET_MEDIA_DOCS = {
  summary: 'Retrieve Scraped Media Gallery',
  description: `
Access the central repository of scraped images and videos. 
Results are paginated and sortable by creation date (newest first).

### 🔍 Advanced Filtering
Narrow down your search using a combination of these filters:

| Filter | Description | Example |
| :--- | :--- | :--- |
| **page** | Page number for pagination. | \`1\` |
| **size** | Number of items per page. | \`20\` |
| **type** | Filter by media type. | \`IMAGE\`, \`VIDEO\` |
| **search** | Partial match on Title or URL. | \`nature\` |
| **startTime** | ISO Date (Start of range). | \`2023-01-01\` |
| **endTime** | ISO Date (End of range). | \`2023-12-31\` |

### 📦 Response
Returns a \`{ data: [], total: number }\` structure, strictly formatted for efficient frontend rendering.
  `,
};

export const DELETE_SOURCE_DOCS = {
  summary: 'Hide Source from History',
  description: `
**User-Specific Action**: Removes a specific Source URL (and its associated media) from the requester's history.

### 🛡️ Privacy & Logic
- **Non-Destructive**: The actual media data remains in the global database if other users have scraped it.
- **Scope**: Only affects the provided \`sessionId\`. 
- **Idempotent**: Safe to call multiple times; returns success even if already removed.

### 🎯 Use Case
Allow users to "forget" a URL they scraped, removing it from their local dashboard view.
  `,
};
