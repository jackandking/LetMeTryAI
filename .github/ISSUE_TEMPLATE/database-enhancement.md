---
name: Database Enhancement
about: Request database schema changes or query optimizations
title: '[DB] '
labels: ['database', 'enhancement']
assignees: ''

---

## 📊 Database Enhancement Request

### Table Name
<!-- e.g., beauty_images, user_data, etc. -->


### Operation Type
<!-- Check one -->
- [ ] Schema Change (ALTER TABLE, CREATE TABLE)
- [ ] Query Optimization
- [ ] New Feature Requiring Database Changes
- [ ] Data Migration
- [ ] Other

### Description
<!-- Clearly describe what database changes are needed and why -->


### Proposed Schema/Query
```sql
-- Provide the SQL you'd like to implement
-- Example:
-- ALTER TABLE beauty_images ADD COLUMN likes INT DEFAULT 0;
```

### Expected Behavior
<!-- What should happen after this change? -->


### MCP Testing
<!-- The MCP server can execute these queries for testing -->
**Test Query Examples:**
```sql
-- Queries that Copilot can run to verify the change works
-- Example:
-- SELECT id, image_url, likes FROM beauty_images LIMIT 5;
```

### Related Files
<!-- Link to related schema files, HTML pages, or JavaScript that will use this -->
- Schema: [nanrenbao/database-schema.sql](../nanrenbao/database-schema.sql)
- Frontend: 
- Backend/API: 

### Additional Context
<!-- Add any other context, screenshots, or examples -->


---
**Note**: This repository has an MCP server that allows Copilot to execute SQL queries directly. When assigned, Copilot can test queries and implement changes automatically.
