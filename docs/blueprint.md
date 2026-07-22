# Mining Task Tracker — Bot specification

**Archetype:** workflow

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A personal Telegram bot for individual miners to log tasks, track progress, set simple timers, and receive reminders. Minimal, command-driven UX with buttons for common actions. Tasks and reminders are private to the user's Telegram account.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual miners

## Success criteria

- User can add, view, update, and delete mining tasks with progress tracking
- User receives scheduled reminders for tasks
- User can export task data to CSV for backup

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Show quick help and last 5 tasks
- **/add** (command, actor: user, command: /add) — Prompt to add a new task with title, optional description, and estimated duration
- **/list** (command, actor: user, command: /list) — List tasks grouped by status with inline action buttons
- **/view** (command, actor: user, command: /view) — View full details of a specific task by ID
- **/done** (command, actor: user, command: /done) — Mark a task as completed by ID
- **/remind** (command, actor: user, command: /remind) — Set a reminder for a task with time and repeat options
- **/export** (command, actor: user, command: /export) — Download a CSV file of all tasks

## Flows

### Add Task
_Trigger:_ /add

1. User sends /add command
2. Bot prompts for task title
3. User provides title
4. Bot asks for optional description
5. User provides description or skips
6. Bot asks for optional estimated duration
7. User provides duration or skips
8. Bot confirms task creation

_Data touched:_ Task

### List Tasks
_Trigger:_ /list

1. User sends /list command
2. Bot displays tasks grouped by status
3. User selects task via inline button
4. Bot shows task details or actions

_Data touched:_ Task

### View Task
_Trigger:_ /view

1. User sends /view <id> command
2. Bot displays full task details
3. User selects action via inline buttons (Update Progress, Set Reminder, Mark Done)

_Data touched:_ Task, Reminder

### Update Progress
_Trigger:_ Update Progress button

1. User selects Update Progress button
2. Bot displays preset progress buttons (10%, 25%, 50%, 75%, 100%)
3. User selects a preset or enters custom percent
4. Bot updates task progress and stores history

_Data touched:_ Task

### Set Reminder
_Trigger:_ /remind

1. User sends /remind <id> command
2. Bot prompts for reminder time (absolute or relative)
3. User provides time
4. Bot asks for repeat option (none/daily/weekly)
5. User selects repeat option
6. Bot creates reminder and confirms

_Data touched:_ Reminder

### Send Reminder
_Trigger:_ Scheduled time

1. System reaches scheduled reminder time
2. Bot sends private message with task link and actions

_Data touched:_ Reminder, Task

### Export Tasks
_Trigger:_ /export

1. User sends /export command
2. Bot generates CSV file
3. Bot sends CSV file to user

_Data touched:_ Task

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Task** _(retention: persistent)_ — A mining task with title, description, start timestamp, estimated duration, progress, status, tags, and update history
  - fields: title, description, start_timestamp, estimated_duration, progress_percent, status, tags, history
- **Reminder** _(retention: persistent)_ — A reminder linked to a task or independent, with time and repeat options
  - fields: task_id, time, repeat

## Integrations

- **Telegram** (required) — Bot API messaging for user interactions and reminders
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Add, update, and delete tasks
- Set and manage reminders
- Export task data to CSV
- View task history and progress

## Notifications

- Scheduled task reminders sent via Telegram
- Task update confirmations
- CSV export completion notification

## Permissions & privacy

- Data is private to the user's Telegram account
- No external data sharing
- User can export data at any time

## Edge cases

- User tries to access a task that doesn't exist
- User provides invalid time format for reminders
- User tries to update progress beyond 100%
- User tries to set a reminder for a past time

## Required tests

- Verify task creation and display
- Test reminder scheduling and delivery
- Validate CSV export functionality
- Confirm progress update buttons work correctly

## Assumptions

- Single-user scope: bot stores data only for the Telegram user who interacts with it
- Progress updates stored as percent and timestamp with optional text note
- Reminders support absolute datetime input or simple relative phrases like 'in 2h'
- Command-first UX with inline-button confirmations for common actions
