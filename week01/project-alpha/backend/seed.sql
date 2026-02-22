-- Seed data for Ticket Manager
-- Run with: psql -U postgres -d ticket_manager -f seed.sql

-- Clear existing data
TRUNCATE TABLE ticket_labels CASCADE;
TRUNCATE TABLE tickets CASCADE;
TRUNCATE TABLE labels CASCADE;

-- Insert Labels (Tags)
-- Platform Tags
INSERT INTO labels (name, color) VALUES
('ios', '#007AFF'),
('android', '#3DDC84'),
('web', '#FF6B35'),
('macos', '#A3AAAE'),
('windows', '#00A4EF'),
('linux', '#FCC624');

-- Project Tags
INSERT INTO labels (name, color) VALUES
('viking', '#8B5CF6'),
('phoenix', '#F97316'),
('atlas', '#06B6D4'),
('nebula', '#EC4899'),
('quantum', '#10B981'),
('horizon', '#6366F1'),
('aurora', '#F59E0B'),
('titan', '#EF4444');

-- Feature Tags
INSERT INTO labels (name, color) VALUES
('autocomplete', '#22C55E'),
('search', '#3B82F6'),
('authentication', '#A855F7'),
('notifications', '#F43F5E'),
('payments', '#EAB308'),
('analytics', '#14B8A6'),
('chat', '#0EA5E9'),
('file-upload', '#84CC16'),
('export', '#F97316'),
('import', '#8B5CF6'),
('settings', '#6B7280'),
('dashboard', '#EC4899'),
('api', '#00D9FF'),
('database', '#FF6B6B'),
('cache', '#FFA500');

-- Priority/Status Tags
INSERT INTO labels (name, color) VALUES
('bug', '#EF4444'),
('feature', '#22C55E'),
('enhancement', '#3B82F6'),
('documentation', '#8B5CF6'),
('performance', '#F59E0B'),
('security', '#DC2626'),
('ui', '#EC4899'),
('ux', '#F472B6'),
('accessibility', '#14B8A6'),
('refactor', '#6366F1'),
('testing', '#10B981');

-- Team Tags
INSERT INTO labels (name, color) VALUES
('frontend', '#61DAFB'),
('backend', '#68A063'),
('devops', '#4A90A4'),
('mobile', '#FF2D55'),
('design', '#FF6B9D');

-- Insert Tickets (50 meaningful tickets)
INSERT INTO tickets (title, description, status, created_at, updated_at) VALUES
-- Viking Project Tickets
('Implement autocomplete for code editor', 'Add intelligent autocomplete functionality to the code editor in Viking project. Should support multiple programming languages and provide context-aware suggestions.', 'open', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('Fix memory leak in iOS app', 'Memory usage keeps growing when scrolling through long lists in the iOS version of Viking. Need to investigate and fix the leak.', 'open', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
('Add dark mode support for web', 'Implement dark mode toggle for the Viking web application. Should persist user preference and respect system settings.', 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days'),
('Optimize database queries for search', 'Search queries are taking too long on large datasets. Need to add proper indexing and optimize the query structure.', 'open', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
('Implement push notifications for Android', 'Add push notification support for the Android version of Viking. Should handle both foreground and background states.', 'open', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),

-- Phoenix Project Tickets
('Migrate authentication to OAuth 2.0', 'Replace the current authentication system with OAuth 2.0 in Phoenix. Support Google, GitHub, and Microsoft providers.', 'open', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
('Add export functionality for reports', 'Users need to export their reports in PDF and Excel formats. Implement server-side generation and download.', 'open', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('Fix crash on macOS when opening large files', 'Application crashes when trying to open files larger than 100MB on macOS. Need to implement streaming or chunked loading.', 'open', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
('Implement real-time collaboration', 'Add real-time collaboration features to Phoenix. Multiple users should be able to edit documents simultaneously.', 'open', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('Add keyboard shortcuts for common actions', 'Implement keyboard shortcuts for frequently used actions in Phoenix. Include a shortcut help overlay.', 'completed', NOW() - INTERVAL '17 days', NOW() - INTERVAL '15 days'),

-- Atlas Project Tickets
('Set up CI/CD pipeline', 'Configure automated build and deployment pipeline for Atlas using GitHub Actions. Include testing stages.', 'completed', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days'),
('Implement caching layer for API responses', 'Add Redis caching for frequently accessed API endpoints in Atlas. Should have proper cache invalidation.', 'open', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('Add unit tests for payment module', 'Write comprehensive unit tests for the payment processing module in Atlas. Aim for at least 80% coverage.', 'open', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('Fix timezone issues in scheduling', 'Event scheduling has timezone-related bugs. Events are showing wrong times for users in different timezones.', 'open', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
('Implement rate limiting for API', 'Add rate limiting to protect Atlas API from abuse. Should support different limits for authenticated and anonymous users.', 'open', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),

-- Nebula Project Tickets
('Design new onboarding flow', 'Create an improved onboarding experience for Nebula. Include interactive tutorials and feature highlights.', 'open', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('Add accessibility support for screen readers', 'Ensure Nebula is fully accessible with screen readers. Fix any ARIA violations and keyboard navigation issues.', 'open', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('Implement file upload with drag and drop', 'Add drag and drop file upload functionality to Nebula. Support multiple files and show upload progress.', 'completed', NOW() - INTERVAL '9 days', NOW() - INTERVAL '5 days'),
('Fix layout issues on tablet devices', 'UI elements are overlapping on tablet-sized screens. Need to fix responsive breakpoints.', 'open', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('Add analytics tracking for user actions', 'Implement analytics tracking to understand user behavior in Nebula. Track key actions and conversion funnels.', 'open', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- Quantum Project Tickets
('Implement search with fuzzy matching', 'Add fuzzy search capability to Quantum. Should handle typos and partial matches effectively.', 'open', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('Add support for custom themes', 'Allow users to create and apply custom themes in Quantum. Include a theme editor with live preview.', 'open', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('Fix performance issues with large datasets', 'Application becomes slow when loading datasets with more than 10,000 records. Need virtualization.', 'open', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('Implement two-factor authentication', 'Add 2FA support to Quantum using TOTP. Include backup codes and recovery options.', 'open', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('Add chat functionality', 'Implement real-time chat feature in Quantum. Support direct messages and group channels.', 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- Horizon Project Tickets
('Create dashboard with key metrics', 'Build a comprehensive dashboard for Horizon showing key business metrics and charts.', 'open', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('Implement data import from CSV', 'Allow users to import data from CSV files into Horizon. Handle various delimiters and encoding.', 'open', NOW(), NOW()),
('Add email notification preferences', 'Let users configure which email notifications they want to receive from Horizon.', 'cancelled', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
('Fix broken image uploads on web', 'Image uploads are failing on the web version of Horizon. Investigate and fix the issue.', 'open', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('Implement audit logging', 'Add comprehensive audit logging for all user actions in Horizon. Include export functionality.', 'open', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

-- Aurora Project Tickets
('Add support for multiple languages', 'Implement i18n support for Aurora. Start with English, Chinese, Spanish, and Japanese.', 'open', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('Fix sync conflicts between devices', 'Data sync is causing conflicts when users edit on multiple devices. Implement conflict resolution.', 'open', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('Implement offline mode', 'Add offline support to Aurora. Users should be able to work without internet and sync later.', 'open', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
('Add biometric authentication for mobile', 'Implement Face ID and Touch ID authentication for Aurora mobile apps.', 'completed', NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days'),
('Create admin panel for user management', 'Build an admin panel for managing users, roles, and permissions in Aurora.', 'open', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- Titan Project Tickets
('Optimize image compression', 'Current image compression is too slow and produces large files. Implement better algorithm.', 'open', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('Add video playback support', 'Implement video playback functionality in Titan. Support common formats and streaming.', 'open', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
('Fix memory warnings on iOS', 'iOS app is receiving memory warnings when processing large files. Optimize memory usage.', 'open', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
('Implement batch processing', 'Allow users to process multiple files at once in Titan. Show progress for each file.', 'open', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
('Add watermark support', 'Implement watermarking feature for images and videos in Titan.', 'open', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),

-- Cross-Project Tickets
('Standardize API response format', 'Create a consistent API response format across all projects. Include proper error handling.', 'open', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('Implement SSO across all platforms', 'Set up single sign-on so users can access all products with one account.', 'open', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
('Create shared component library', 'Build a reusable component library for all frontend projects. Use Storybook for documentation.', 'open', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('Set up monitoring and alerting', 'Configure application monitoring and alerting for all services. Use Prometheus and Grafana.', 'open', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
('Implement A/B testing framework', 'Create a framework for running A/B tests across all products. Include analytics integration.', 'open', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- Bug Fixes
('Fix login redirect loop', 'Some users are experiencing infinite redirect loops when trying to log in. Investigate session handling.', 'open', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('Resolve race condition in file saving', 'Concurrent saves to the same file are causing data corruption. Implement proper locking.', 'open', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('Fix incorrect date formatting', 'Dates are being displayed in wrong format for some locales. Fix the formatting logic.', 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
('Resolve SSL certificate issues', 'Some API calls are failing due to SSL certificate validation errors. Update certificate bundle.', 'open', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('Fix pagination not working correctly', 'Pagination is skipping records on certain page sizes. Fix the offset calculation.', 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- Insert Ticket-Label Associations
-- Viking Project Labels
INSERT INTO ticket_labels (ticket_id, label_id) VALUES
(1, (SELECT id FROM labels WHERE name = 'viking')),
(1, (SELECT id FROM labels WHERE name = 'autocomplete')),
(1, (SELECT id FROM labels WHERE name = 'feature')),
(2, (SELECT id FROM labels WHERE name = 'viking')),
(2, (SELECT id FROM labels WHERE name = 'ios')),
(2, (SELECT id FROM labels WHERE name = 'bug')),
(2, (SELECT id FROM labels WHERE name = 'performance')),
(3, (SELECT id FROM labels WHERE name = 'viking')),
(3, (SELECT id FROM labels WHERE name = 'web')),
(3, (SELECT id FROM labels WHERE name = 'ui')),
(4, (SELECT id FROM labels WHERE name = 'viking')),
(4, (SELECT id FROM labels WHERE name = 'search')),
(4, (SELECT id FROM labels WHERE name = 'database')),
(4, (SELECT id FROM labels WHERE name = 'performance')),
(5, (SELECT id FROM labels WHERE name = 'viking')),
(5, (SELECT id FROM labels WHERE name = 'android')),
(5, (SELECT id FROM labels WHERE name = 'notifications')),
(5, (SELECT id FROM labels WHERE name = 'feature')),

-- Phoenix Project Labels
(6, (SELECT id FROM labels WHERE name = 'phoenix')),
(6, (SELECT id FROM labels WHERE name = 'authentication')),
(6, (SELECT id FROM labels WHERE name = 'security')),
(7, (SELECT id FROM labels WHERE name = 'phoenix')),
(7, (SELECT id FROM labels WHERE name = 'export')),
(7, (SELECT id FROM labels WHERE name = 'feature')),
(8, (SELECT id FROM labels WHERE name = 'phoenix')),
(8, (SELECT id FROM labels WHERE name = 'macos')),
(8, (SELECT id FROM labels WHERE name = 'bug')),
(9, (SELECT id FROM labels WHERE name = 'phoenix')),
(9, (SELECT id FROM labels WHERE name = 'feature')),
(9, (SELECT id FROM labels WHERE name = 'api')),
(10, (SELECT id FROM labels WHERE name = 'phoenix')),
(10, (SELECT id FROM labels WHERE name = 'ux')),
(10, (SELECT id FROM labels WHERE name = 'enhancement')),

-- Atlas Project Labels
(11, (SELECT id FROM labels WHERE name = 'atlas')),
(11, (SELECT id FROM labels WHERE name = 'devops')),
(11, (SELECT id FROM labels WHERE name = 'testing')),
(12, (SELECT id FROM labels WHERE name = 'atlas')),
(12, (SELECT id FROM labels WHERE name = 'cache')),
(12, (SELECT id FROM labels WHERE name = 'api')),
(12, (SELECT id FROM labels WHERE name = 'performance')),
(13, (SELECT id FROM labels WHERE name = 'atlas')),
(13, (SELECT id FROM labels WHERE name = 'payments')),
(13, (SELECT id FROM labels WHERE name = 'testing')),
(14, (SELECT id FROM labels WHERE name = 'atlas')),
(14, (SELECT id FROM labels WHERE name = 'bug')),
(14, (SELECT id FROM labels WHERE name = 'backend')),
(15, (SELECT id FROM labels WHERE name = 'atlas')),
(15, (SELECT id FROM labels WHERE name = 'api')),
(15, (SELECT id FROM labels WHERE name = 'security')),

-- Nebula Project Labels
(16, (SELECT id FROM labels WHERE name = 'nebula')),
(16, (SELECT id FROM labels WHERE name = 'ux')),
(16, (SELECT id FROM labels WHERE name = 'feature')),
(17, (SELECT id FROM labels WHERE name = 'nebula')),
(17, (SELECT id FROM labels WHERE name = 'accessibility')),
(17, (SELECT id FROM labels WHERE name = 'web')),
(18, (SELECT id FROM labels WHERE name = 'nebula')),
(18, (SELECT id FROM labels WHERE name = 'file-upload')),
(18, (SELECT id FROM labels WHERE name = 'feature')),
(19, (SELECT id FROM labels WHERE name = 'nebula')),
(19, (SELECT id FROM labels WHERE name = 'bug')),
(19, (SELECT id FROM labels WHERE name = 'ui')),
(20, (SELECT id FROM labels WHERE name = 'nebula')),
(20, (SELECT id FROM labels WHERE name = 'analytics')),
(20, (SELECT id FROM labels WHERE name = 'feature')),

-- Quantum Project Labels
(21, (SELECT id FROM labels WHERE name = 'quantum')),
(21, (SELECT id FROM labels WHERE name = 'search')),
(21, (SELECT id FROM labels WHERE name = 'feature')),
(22, (SELECT id FROM labels WHERE name = 'quantum')),
(22, (SELECT id FROM labels WHERE name = 'ui')),
(22, (SELECT id FROM labels WHERE name = 'feature')),
(23, (SELECT id FROM labels WHERE name = 'quantum')),
(23, (SELECT id FROM labels WHERE name = 'performance')),
(23, (SELECT id FROM labels WHERE name = 'bug')),
(24, (SELECT id FROM labels WHERE name = 'quantum')),
(24, (SELECT id FROM labels WHERE name = 'authentication')),
(24, (SELECT id FROM labels WHERE name = 'security')),
(25, (SELECT id FROM labels WHERE name = 'quantum')),
(25, (SELECT id FROM labels WHERE name = 'chat')),
(25, (SELECT id FROM labels WHERE name = 'feature')),

-- Horizon Project Labels
(26, (SELECT id FROM labels WHERE name = 'horizon')),
(26, (SELECT id FROM labels WHERE name = 'dashboard')),
(26, (SELECT id FROM labels WHERE name = 'feature')),
(27, (SELECT id FROM labels WHERE name = 'horizon')),
(27, (SELECT id FROM labels WHERE name = 'import')),
(27, (SELECT id FROM labels WHERE name = 'feature')),
(28, (SELECT id FROM labels WHERE name = 'horizon')),
(28, (SELECT id FROM labels WHERE name = 'notifications')),
(28, (SELECT id FROM labels WHERE name = 'enhancement')),
(29, (SELECT id FROM labels WHERE name = 'horizon')),
(29, (SELECT id FROM labels WHERE name = 'web')),
(29, (SELECT id FROM labels WHERE name = 'bug')),
(30, (SELECT id FROM labels WHERE name = 'horizon')),
(30, (SELECT id FROM labels WHERE name = 'backend')),
(30, (SELECT id FROM labels WHERE name = 'feature')),

-- Aurora Project Labels
(31, (SELECT id FROM labels WHERE name = 'aurora')),
(31, (SELECT id FROM labels WHERE name = 'feature')),
(31, (SELECT id FROM labels WHERE name = 'frontend')),
(32, (SELECT id FROM labels WHERE name = 'aurora')),
(32, (SELECT id FROM labels WHERE name = 'bug')),
(32, (SELECT id FROM labels WHERE name = 'database')),
(33, (SELECT id FROM labels WHERE name = 'aurora')),
(33, (SELECT id FROM labels WHERE name = 'feature')),
(33, (SELECT id FROM labels WHERE name = 'mobile')),
(34, (SELECT id FROM labels WHERE name = 'aurora')),
(34, (SELECT id FROM labels WHERE name = 'ios')),
(34, (SELECT id FROM labels WHERE name = 'android')),
(34, (SELECT id FROM labels WHERE name = 'authentication')),
(35, (SELECT id FROM labels WHERE name = 'aurora')),
(35, (SELECT id FROM labels WHERE name = 'backend')),
(35, (SELECT id FROM labels WHERE name = 'feature')),

-- Titan Project Labels
(36, (SELECT id FROM labels WHERE name = 'titan')),
(36, (SELECT id FROM labels WHERE name = 'performance')),
(36, (SELECT id FROM labels WHERE name = 'enhancement')),
(37, (SELECT id FROM labels WHERE name = 'titan')),
(37, (SELECT id FROM labels WHERE name = 'feature')),
(37, (SELECT id FROM labels WHERE name = 'mobile')),
(38, (SELECT id FROM labels WHERE name = 'titan')),
(38, (SELECT id FROM labels WHERE name = 'ios')),
(38, (SELECT id FROM labels WHERE name = 'bug')),
(38, (SELECT id FROM labels WHERE name = 'performance')),
(39, (SELECT id FROM labels WHERE name = 'titan')),
(39, (SELECT id FROM labels WHERE name = 'feature')),
(39, (SELECT id FROM labels WHERE name = 'ux')),
(40, (SELECT id FROM labels WHERE name = 'titan')),
(40, (SELECT id FROM labels WHERE name = 'feature')),
(40, (SELECT id FROM labels WHERE name = 'enhancement')),

-- Cross-Project Labels
(41, (SELECT id FROM labels WHERE name = 'api')),
(41, (SELECT id FROM labels WHERE name = 'backend')),
(41, (SELECT id FROM labels WHERE name = 'refactor')),
(42, (SELECT id FROM labels WHERE name = 'authentication')),
(42, (SELECT id FROM labels WHERE name = 'security')),
(42, (SELECT id FROM labels WHERE name = 'feature')),
(43, (SELECT id FROM labels WHERE name = 'frontend')),
(43, (SELECT id FROM labels WHERE name = 'ui')),
(43, (SELECT id FROM labels WHERE name = 'refactor')),
(44, (SELECT id FROM labels WHERE name = 'devops')),
(44, (SELECT id FROM labels WHERE name = 'backend')),
(44, (SELECT id FROM labels WHERE name = 'feature')),
(45, (SELECT id FROM labels WHERE name = 'analytics')),
(45, (SELECT id FROM labels WHERE name = 'feature')),
(45, (SELECT id FROM labels WHERE name = 'frontend')),

-- Bug Fix Labels
(46, (SELECT id FROM labels WHERE name = 'bug')),
(46, (SELECT id FROM labels WHERE name = 'authentication')),
(46, (SELECT id FROM labels WHERE name = 'web')),
(47, (SELECT id FROM labels WHERE name = 'bug')),
(47, (SELECT id FROM labels WHERE name = 'database')),
(47, (SELECT id FROM labels WHERE name = 'backend')),
(48, (SELECT id FROM labels WHERE name = 'bug')),
(48, (SELECT id FROM labels WHERE name = 'frontend')),
(49, (SELECT id FROM labels WHERE name = 'bug')),
(49, (SELECT id FROM labels WHERE name = 'api')),
(49, (SELECT id FROM labels WHERE name = 'security')),
(50, (SELECT id FROM labels WHERE name = 'bug')),
(50, (SELECT id FROM labels WHERE name = 'api')),
(50, (SELECT id FROM labels WHERE name = 'backend'));

-- Verify the data
SELECT 'Labels count: ' || COUNT(*) FROM labels;
SELECT 'Tickets count: ' || COUNT(*) FROM tickets;
SELECT 'Ticket-Label associations: ' || COUNT(*) FROM ticket_labels;
