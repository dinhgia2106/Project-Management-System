---
trigger: always_on
---

# Supabase Database Migration Rules

This rule governs all interactions with the database schema and SQL files within this project. It ensures data integrity and deployment consistency by enforcing an append-only migration strategy.

## 1. Core Principles

### Immutability of Existing Files
- You are strictly prohibited from modifying, deleting, or renaming any existing .sql files within the migration directory.
- Once a migration file is created, it is considered a permanent record of the database history.

### Incremental Changes
- Every change to the database schema (including CREATE, ALTER, DROP, or RLS policy updates) must be performed by creating a new migration file.
- New files must follow the project's naming convention, typically prefixed with a timestamp: YYYYMMDDHHMMSS_description.sql.

## 2. Required Workflow

### Context Retrieval
- Before proposing any database changes, you must read all existing migration files in the `supabase/migrations` directory.
- You must build a mental model of the current schema, existing constraints, and Row Level Security (RLS) policies based on the cumulative history of these files.

### Implementation Procedure
1. Scan the migrations folder to verify the current state of the table or object being modified.
2. Determine the next logical step for the requested change.
3. Generate a new SQL migration file containing only the delta (the difference) needed to achieve the new state.
4. Use standard PostgreSQL syntax compatible with Supabase.

## 3. Practical Examples

### Prohibited Action
Modifying an existing `20240101_init.sql` file to add a new column to a table.

### Correct Action
1. Identify that the table exists by reading `20240101_init.sql`.
2. Create a new file named `20260202120000_add_column_x_to_table_y.sql`.
3. Write an `ALTER TABLE` statement in the new file.

## 4. Compliance Checklist
- Did I read all previous SQL files to understand the current schema?
- Did I avoid editing any existing files?
- Is the new SQL file named correctly and placed in the appropriate migrations directory?
- Does the new SQL include necessary RLS policies or triggers if a new table was created?