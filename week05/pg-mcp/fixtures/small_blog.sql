-- Small Database: Simple Blog System
-- Purpose: Test basic schema caching, simple queries, basic relationships
-- Scale: 5 tables, 1 view, 4 indexes, ~60 rows total

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status_published ON posts(status, published_at) WHERE status = 'published';
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_tags_slug ON tags(slug);

-- Views
CREATE VIEW published_posts AS
SELECT p.id, p.title, p.slug, p.excerpt, p.view_count, p.published_at,
       u.username AS author_name, COUNT(c.id) AS comment_count
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN comments c ON p.id = c.post_id AND c.status = 'approved'
WHERE p.status = 'published'
GROUP BY p.id, u.username;

-- Sample Data
INSERT INTO users (username, email, password_hash, bio, status) VALUES
('alice', 'alice@example.com', '$2b$12$hash', 'Software developer and tech blogger', 'active'),
('bob', 'bob@example.com', '$2b$12$hash', 'Data scientist passionate about ML', 'active'),
('charlie', 'charlie@example.com', '$2b$12$hash', 'Full-stack developer', 'active'),
('diana', 'diana@example.com', '$2b$12$hash', 'UX designer and writer', 'active'),
('eve', 'eve@example.com', '$2b$12$hash', 'DevOps engineer', 'active'),
('frank', 'frank@example.com', '$2b$12$hash', 'Mobile app developer', 'active'),
('grace', 'grace@example.com', '$2b$12$hash', 'Security researcher', 'active'),
('henry', 'henry@example.com', '$2b$12$hash', 'Backend developer', 'active');

INSERT INTO tags (name, slug, description) VALUES
('Technology', 'technology', 'Tech news and tutorials'),
('Programming', 'programming', 'Programming languages and techniques'),
('Data Science', 'data-science', 'Data analysis and machine learning'),
('Web Development', 'web-development', 'Frontend and backend web dev'),
('DevOps', 'devops', 'DevOps and cloud infrastructure');

INSERT INTO posts (author_id, title, slug, content, excerpt, status, view_count, published_at) VALUES
(1, 'Getting Started with TypeScript', 'getting-started-typescript',
 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
 'A comprehensive guide to TypeScript fundamentals', 'published', 1250, '2024-01-15 10:00:00'),
(2, 'Introduction to Machine Learning', 'intro-machine-learning',
 'Machine learning is revolutionizing how we solve complex problems.',
 'Learn the basics of machine learning and AI', 'published', 890, '2024-01-18 14:30:00'),
(3, 'Building REST APIs with Node.js', 'building-rest-apis-nodejs',
 'REST APIs are the backbone of modern web applications.',
 'A practical guide to building RESTful APIs', 'published', 2100, '2024-01-20 09:15:00'),
(1, 'React Hooks Deep Dive', 'react-hooks-deep-dive',
 'React Hooks have changed how we write React components.',
 'Master React Hooks with this comprehensive guide', 'published', 1580, '2024-01-22 11:45:00'),
(4, 'UX Design Principles for Developers', 'ux-design-for-developers',
 'Good UX design is crucial for product success.',
 'Essential UX principles for developers', 'published', 720, '2024-01-25 16:00:00'),
(5, 'Docker and Kubernetes for Beginners', 'docker-kubernetes-beginners',
 'Containerization has transformed software deployment.',
 'Get started with containerization and orchestration', 'published', 1890, '2024-01-28 13:20:00'),
(7, 'Web Security Best Practices', 'web-security-best-practices',
 'Security should never be an afterthought.',
 'Essential security practices for web applications', 'published', 1100, '2024-02-05 15:00:00'),
(8, 'PostgreSQL Performance Tuning', 'postgresql-performance-tuning',
 'Optimize your PostgreSQL database for better performance.',
 'Advanced PostgreSQL optimization techniques', 'published', 1650, '2024-02-08 09:00:00');

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 2), (1, 4), (2, 3), (3, 2), (3, 4), (3, 5), (4, 2), (4, 4), (5, 4),
(6, 5), (7, 4), (8, 2), (8, 4);

INSERT INTO comments (post_id, author_id, content, status) VALUES
(1, 3, 'Great introduction to TypeScript! Very helpful for beginners.', 'approved'),
(1, 5, 'Would love to see a follow-up on advanced types.', 'approved'),
(2, 1, 'Excellent overview of ML concepts. Thanks for sharing!', 'approved'),
(3, 2, 'The section on error handling was particularly useful.', 'approved'),
(4, 8, 'Finally understood useEffect thanks to this article.', 'approved'),
(5, 6, 'UX is often overlooked by developers. Great article!', 'approved'),
(6, 8, 'Docker has made deployment so much easier for our team.', 'approved'),
(7, 2, 'Security is so important. Thanks for covering this.', 'approved'),
(8, 3, 'PostgreSQL tuning can be tricky. This helps a lot.', 'approved'),
(3, 6, 'Check out this suspicious link...', 'spam');

INSERT INTO comments (post_id, author_id, parent_id, content, status) VALUES
(1, 1, 1, 'Thanks! Glad you found it helpful.', 'approved'),
(3, 3, 4, 'I can add more authentication examples in a future article.', 'approved');
