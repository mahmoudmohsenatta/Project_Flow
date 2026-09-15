# AI Usage Documentation

### 01 Tools used
- DeepMind Antigravity (Advanced Agentic Coding Assistant)

### 02 How you used them
- **Planning & Strategy**: Formulated an execution plan (Phase 1 to 10) mapping the assessment criteria.
- **Exploration & Context Gathering**: Read through the architecture and schemas to understand relationships between tasks, users, and projects.
- **Test Generation**: Generated the foundation for the E2E tests covering task assignment and concurrency, leveraging Supertest and Jest.
- **Debugging & Troubleshooting**: Investigated authorization bypass issues on the `TasksService.updateStatus` and addressed disk space limit errors (`ENOSPC`) locally by understanding memory-server limitations.
- **Concurrency Discussion**: Assisted in comparing architectural approaches (Redis locking vs MongoDB atomic `$inc`) for the task numbering concurrency fix.

### 03 Suggestions you rejected
- **Rejected generating a full test environment over unit tests initially**: The AI initially suggested creating extensive new test configurations. I rejected and modified this to integrate with the existing `tasks.e2e.spec.ts` structure to respect the existing architecture and work within the disk space constraints (`ENOSPC` with `mongodb-memory-server`). 
- **Rejected fetching full user objects in activity history via `$lookup`**: The AI suggested using complex MongoDB aggregation pipelines for activity history. I rejected this in favor of keeping the `TaskActivity` schema clean and resolving actors at the service level with `findManyByIds`, maintaining consistency with how `TasksService` handles user references.

### 04 Generated code you modified
- **Generated code**: The AI generated the `TaskAssigneeSelect` frontend component with a naive direct update mutation.
- **Why it was insufficient**: It lacked proper optimistic updates, rollback mechanisms, and disabled states during mutation.
- **What was changed**: I modified the `useUpdateTask` mutation to update the TanStack Query cache optimistically (`onMutate`) and rollback the cache to its previous state on error (`onError`). This ensured a snappier, responsive UI while maintaining data consistency.
