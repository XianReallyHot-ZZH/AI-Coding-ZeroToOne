-- Large Database: Enterprise Resource Planning (ERP) System
-- Purpose: Test enterprise-level schema caching, complex queries, multi-schema relationships
-- Scale: 40+ tables, 15+ views, 20+ custom types, 50+ indexes, 5000+ rows

-- Drop existing objects
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS hr CASCADE;
DROP SCHEMA IF EXISTS crm CASCADE;
DROP SCHEMA IF EXISTS finance CASCADE;
DROP SCHEMA IF EXISTS inventory CASCADE;
DROP SCHEMA IF EXISTS projects CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS customer_type CASCADE;
DROP TYPE IF EXISTS customer_tier CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS deal_stage CASCADE;
DROP TYPE IF EXISTS deal_priority CASCADE;
DROP TYPE IF EXISTS currency CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;
DROP TYPE IF EXISTS product_type CASCADE;
DROP TYPE IF EXISTS warehouse_type CASCADE;
DROP TYPE IF EXISTS stock_movement_type CASCADE;
DROP TYPE IF EXISTS employee_status CASCADE;
DROP TYPE IF EXISTS employment_type CASCADE;
DROP TYPE IF EXISTS department CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;

-- Create schemas
CREATE SCHEMA public;
CREATE SCHEMA hr;
CREATE SCHEMA crm;
CREATE SCHEMA finance;
CREATE SCHEMA inventory;
CREATE SCHEMA projects;

-- ============================================================================
-- Custom Types
-- ============================================================================

-- User Management Types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted', 'pending_verification');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'supervisor', 'user', 'viewer', 'guest');

-- CRM Types
CREATE TYPE customer_type AS ENUM ('individual', 'business', 'government', 'non_profit');
CREATE TYPE customer_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze', 'standard');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'recycled');
CREATE TYPE deal_stage AS ENUM ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE deal_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');

-- Finance Types
CREATE TYPE currency AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'refund', 'adjustment', 'tax_payment');
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'other');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'uncollectible');
CREATE TYPE expense_category AS ENUM ('salary', 'rent', 'utilities', 'supplies', 'travel', 'marketing', 'software', 'hardware', 'insurance', 'other');

-- Inventory Types
CREATE TYPE product_type AS ENUM ('raw_material', 'component', 'finished_good', 'service', 'digital', 'consumable');
CREATE TYPE warehouse_type AS ENUM ('main', 'branch', 'warehouse', 'store', 'vendor', 'temporary');
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'transfer', 'return', 'adjustment', 'damage', 'loss', 'production', 'consumption');

-- HR Types
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_leave', 'terminated', 'resigned', 'on_probation');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'consultant', 'freelance');
CREATE TYPE department AS ENUM ('executive', 'hr', 'finance', 'it', 'sales', 'marketing', 'operations', 'production', 'logistics', 'customer_service');

-- Project Types
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived');
CREATE TYPE task_priority AS ENUM ('lowest', 'low', 'medium', 'high', 'highest', 'critical');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done', 'blocked', 'cancelled');

-- Notification Types
CREATE TYPE notification_type AS ENUM ('system', 'email', 'sms', 'push', 'in_app', 'webhook');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled');

-- ============================================================================
-- Public Schema: Core Tables
-- ============================================================================

CREATE TABLE public.organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    tax_id VARCHAR(50),
    registration_number VARCHAR(50),
    website_url VARCHAR(255),
    logo_url VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    founded_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.locations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50) NOT NULL,
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    phone VARCHAR(30),
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES public.locations(id) ON DELETE SET NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url VARCHAR(255),
    phone VARCHAR(30),
    status user_status DEFAULT 'active',
    last_login_at TIMESTAMP,
    last_login_ip INET,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    granted_by INTEGER REFERENCES public.users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE (user_id, role, resource_type, resource_id)
);

CREATE TABLE public.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    location_id INTEGER REFERENCES public.locations(id),
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE public.user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, preference_key)
);

CREATE TABLE public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    status notification_status DEFAULT 'pending',
    subject VARCHAR(255),
    body TEXT,
    data JSONB,
    priority SMALLINT DEFAULT 0,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.attachments (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.settings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB,
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, key)
);

-- ============================================================================
-- HR Schema: Human Resources Management
-- ============================================================================

CREATE TABLE hr.employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    marital_status VARCHAR(50),
    department department NOT NULL,
    position VARCHAR(100),
    job_title VARCHAR(100),
    employment_type employment_type NOT NULL,
    status employee_status DEFAULT 'active',
    hire_date DATE NOT NULL,
    probation_end_date DATE,
    termination_date DATE,
    termination_reason TEXT,
    salary DECIMAL(12, 2),
    currency currency DEFAULT 'USD',
    pay_frequency VARCHAR(20),
    work_location_id INTEGER REFERENCES public.locations(id),
    manager_id INTEGER REFERENCES hr.employees(id),
    avatar_url VARCHAR(255),
    bio TEXT,
    skills JSONB,
    education JSONB,
    certifications JSONB,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relationship VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hr.employee_addresses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hr.employee_contacts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL,
    contact_value VARCHAR(150) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hr.time_off_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    requires_approval BOOLEAN DEFAULT true,
    default_allowance INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hr.time_off_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE CASCADE,
    time_off_type_id INTEGER REFERENCES hr.time_off_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES hr.employees(id),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hr.attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    break_duration_minutes INTEGER DEFAULT 0,
    total_worked_minutes INTEGER,
    status VARCHAR(50) DEFAULT 'present',
    notes TEXT,
    location_id INTEGER REFERENCES public.locations(id),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, date)
);

CREATE TABLE hr.performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES hr.employees(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating DECIMAL(3, 2),
    rating_scale JSONB,
    strengths TEXT,
    areas_for_improvement TEXT,
    goals JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CRM Schema: Customer Relationship Management
-- ============================================================================

CREATE TABLE crm.customers (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_type customer_type NOT NULL,
    tier customer_tier DEFAULT 'standard',
    company_name VARCHAR(200),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    tax_id VARCHAR(50),
    billing_address JSONB,
    shipping_address JSONB,
    lead_source VARCHAR(100),
    assigned_to INTEGER REFERENCES public.users(id),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    tags JSONB,
    custom_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm.contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(30),
    mobile VARCHAR(30),
    is_primary BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    social_media JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm.leads (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES crm.contacts(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    description TEXT,
    lead_status lead_status DEFAULT 'new',
    estimated_value DECIMAL(12, 2),
    currency currency DEFAULT 'USD',
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    lead_source VARCHAR(100),
    assigned_to INTEGER REFERENCES public.users(id),
    tags JSONB,
    custom_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm.activities (
    id BIGSERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES crm.leads(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES crm.deals(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES crm.contacts(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    subject VARCHAR(200),
    description TEXT,
    duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    assigned_to INTEGER REFERENCES public.users(id),
    created_by INTEGER REFERENCES public.users(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location VARCHAR(200),
    outcome TEXT,
    follow_up_date DATE,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm.deals (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES crm.leads(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES crm.contacts(id) ON DELETE SET NULL,
    deal_number VARCHAR(50) NOT NULL UNIQUE,
    deal_name VARCHAR(200) NOT NULL,
    description TEXT,
    deal_stage deal_stage DEFAULT 'prospecting',
    deal_priority deal_priority DEFAULT 'medium',
    amount DECIMAL(12, 2) NOT NULL,
    currency currency DEFAULT 'USD',
    weighted_amount DECIMAL(12, 2),
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    actual_close_date DATE,
    win_loss_reason TEXT,
    assigned_to INTEGER REFERENCES public.users(id),
    team_id INTEGER,
    tags JSONB,
    custom_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.categories (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES inventory.categories(id) ON DELETE SET NULL,
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, category_code)
);

CREATE TABLE inventory.products (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES inventory.categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) NOT NULL,
    upc VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    product_type product_type NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    manufacturer VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'each',
    weight DECIMAL(10, 3),
    weight_unit VARCHAR(10),
    dimensions JSONB,
    cost_price DECIMAL(12, 2),
    selling_price DECIMAL(12, 2),
    currency currency DEFAULT 'USD',
    reorder_level INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    lead_time_days INTEGER,
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
    barcode VARCHAR(100),
    images JSONB,
    specifications JSONB,
    tags JSONB,
    custom_fields JSONB,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, sku)
);

