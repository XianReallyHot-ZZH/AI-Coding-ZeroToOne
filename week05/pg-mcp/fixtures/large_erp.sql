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

CREATE TABLE crm.deal_items (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER REFERENCES crm.deals(id) ON DELETE CASCADE,
    product_id INTEGER,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    tax_percent DECIMAL(5, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm.tasks (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    related_to_type VARCHAR(50),
    related_to_id INTEGER,
    lead_id INTEGER REFERENCES crm.leads(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES crm.deals(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMP,
    assigned_to INTEGER REFERENCES public.users(id),
    created_by INTEGER REFERENCES public.users(id),
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Finance Schema: Financial Management
-- ============================================================================

CREATE TABLE finance.chart_of_accounts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_category VARCHAR(50),
    parent_account_id INTEGER REFERENCES finance.chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.accounts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    currency currency DEFAULT 'USD',
    balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.transactions (
    id BIGSERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES finance.accounts(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency currency DEFAULT 'USD',
    balance_after DECIMAL(15, 2),
    reference_number VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    counterparty VARCHAR(200),
    payment_method payment_method,
    transaction_date DATE NOT NULL,
    posted_at TIMESTAMP,
    created_by INTEGER REFERENCES public.users(id),
    attachment_id INTEGER REFERENCES public.attachments(id),
    notes TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES crm.customers(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES crm.deals(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency currency DEFAULT 'USD',
    status invoice_status DEFAULT 'draft',
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_due DECIMAL(12, 2),
    notes TEXT,
    terms TEXT,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES finance.invoices(id) ON DELETE CASCADE,
    product_id INTEGER,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    tax_percent DECIMAL(5, 2) DEFAULT 0,
    line_total DECIMAL(12, 2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.invoice_payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES finance.invoices(id) ON DELETE CASCADE,
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method payment_method,
    reference_number VARCHAR(100),
    notes TEXT,
    received_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.expenses (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    category expense_category NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency currency DEFAULT 'USD',
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(200),
    vendor_id INTEGER,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    employee_id INTEGER REFERENCES hr.employees(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects.projects(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES finance.accounts(id),
    payment_method payment_method,
    reference_number VARCHAR(100),
    receipt_id INTEGER REFERENCES public.attachments(id),
    approved_by INTEGER REFERENCES public.users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    tags JSONB,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance.budgets (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    budget_name VARCHAR(200) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    account_id INTEGER REFERENCES finance.accounts(id),
    budgeted_amount DECIMAL(15, 2) NOT NULL,
    actual_amount DECIMAL(15, 2) DEFAULT 0,
    variance DECIMAL(15, 2),
    variance_percent DECIMAL(5, 2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Inventory Schema: Inventory and Supply Chain
-- ============================================================================

CREATE TABLE inventory.warehouses (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES public.locations(id) ON DELETE CASCADE,
    warehouse_code VARCHAR(50) NOT NULL UNIQUE,
    warehouse_name VARCHAR(200) NOT NULL,
    warehouse_type warehouse_type NOT NULL,
    manager_id INTEGER REFERENCES hr.employees(id),
    capacity DECIMAL(15, 2),
    current_utilization DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
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

CREATE TABLE inventory.product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES inventory.products(id) ON DELETE CASCADE,
    variant_name VARCHAR(200) NOT NULL,
    variant_sku VARCHAR(50),
    variant_attributes JSONB NOT NULL,
    price_adjustment DECIMAL(12, 2) DEFAULT 0,
    cost_adjustment DECIMAL(12, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.inventory_items (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES inventory.products(id) ON DELETE CASCADE,
    product_variant_id INTEGER REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_allocated INTEGER DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    reorder_point INTEGER DEFAULT 10,
    maximum_stock_level INTEGER,
    last_count_date DATE,
    last_counted_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, product_id, product_variant_id)
);

CREATE TABLE inventory.stock_movements (
    id BIGSERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES inventory.products(id) ON DELETE CASCADE,
    product_variant_id INTEGER REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    performed_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.suppliers (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(150),
    phone VARCHAR(30),
    website VARCHAR(255),
    address JSONB,
    tax_id VARCHAR(50),
    payment_terms INTEGER,
    currency currency DEFAULT 'USD',
    rating DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.purchase_orders (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES inventory.suppliers(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES inventory.warehouses(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency currency DEFAULT 'USD',
    notes TEXT,
    internal_notes TEXT,
    created_by INTEGER REFERENCES public.users(id),
    approved_by INTEGER REFERENCES public.users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES inventory.purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES inventory.products(id) ON DELETE CASCADE,
    product_variant_id INTEGER REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    description VARCHAR(500),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    tax_percent DECIMAL(5, 2) DEFAULT 0,
    line_total DECIMAL(12, 2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Projects Schema: Project Management
-- ============================================================================

CREATE TABLE projects.projects (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    project_status project_status DEFAULT 'planning',
    project_manager_id INTEGER REFERENCES public.users(id),
    client_id INTEGER REFERENCES crm.customers(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    budget DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),
    currency currency DEFAULT 'USD',
    priority VARCHAR(20) DEFAULT 'medium',
    completion_percent INTEGER DEFAULT 0,
    tags JSONB,
    custom_fields JSONB,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects.project_teams (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects.projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    hourly_rate DECIMAL(10, 2),
    join_date DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, user_id)
);

CREATE TABLE projects.milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects.projects(id) ON DELETE CASCADE,
    milestone_name VARCHAR(200) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    is_critical BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects.tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects.projects(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES projects.milestones(id) ON DELETE SET NULL,
    parent_task_id INTEGER REFERENCES projects.tasks(id) ON DELETE SET NULL,
    task_number VARCHAR(50) NOT NULL,
    task_name VARCHAR(200) NOT NULL,
    description TEXT,
    task_status task_status DEFAULT 'backlog',
    task_priority task_priority DEFAULT 'medium',
    assignee_id INTEGER REFERENCES public.users(id),
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    completion_percent INTEGER DEFAULT 0,
    tags JSONB,
    custom_fields JSONB,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects.task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES projects.tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER REFERENCES projects.tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'finish_to_start',
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (task_id, depends_on_task_id)
);

CREATE TABLE projects.time_entries (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES projects.tasks(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects.projects(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(10, 2) NOT NULL,
    description TEXT,
    billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10, 2),
    is_approved BOOLEAN DEFAULT false,
    approved_by INTEGER REFERENCES public.users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects.task_comments (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES projects.tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    attachment_id INTEGER REFERENCES public.attachments(id),
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes (Public Schema)
-- ============================================================================

CREATE INDEX idx_users_organization ON public.users(organization_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_sessions_active ON public.user_sessions(is_active);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_attachments_entity ON public.attachments(entity_type, entity_id);

-- ============================================================================
-- Indexes (HR Schema)
-- ============================================================================

CREATE INDEX hr_idx_employees_user ON hr.employees(user_id);
CREATE INDEX hr_idx_employees_department ON hr.employees(department);
CREATE INDEX hr_idx_employees_status ON hr.employees(status);
CREATE INDEX hr_idx_employees_manager ON hr.employees(manager_id);
CREATE INDEX hr_idx_time_off_employee ON hr.time_off_requests(employee_id);
CREATE INDEX hr_idx_time_off_status ON hr.time_off_requests(status);
CREATE INDEX hr_idx_attendance_employee ON hr.attendance(employee_id);
CREATE INDEX hr_idx_attendance_date ON hr.attendance(date);
CREATE INDEX hr_idx_reviews_employee ON hr.performance_reviews(employee_id);

-- ============================================================================
-- Indexes (CRM Schema)
-- ============================================================================

CREATE INDEX crm_idx_customers_org ON crm.customers(organization_id);
CREATE INDEX crm_idx_customers_type ON crm.customers(customer_type);
CREATE INDEX crm_idx_customers_tier ON crm.customers(tier);
CREATE INDEX crm_idx_customers_assigned ON crm.customers(assigned_to);
CREATE INDEX crm_idx_contacts_customer ON crm.contacts(customer_id);
CREATE INDEX crm_idx_leads_org ON crm.leads(organization_id);
CREATE INDEX crm_idx_leads_status ON crm.leads(lead_status);
CREATE INDEX crm_idx_leads_assigned ON crm.leads(assigned_to);
CREATE INDEX crm_idx_deals_customer ON crm.deals(customer_id);
CREATE INDEX crm_idx_deals_stage ON crm.deals(deal_stage);
CREATE INDEX crm_idx_deals_assigned ON crm.deals(assigned_to);
CREATE INDEX crm_idx_activities_lead ON crm.activities(lead_id);
CREATE INDEX crm_idx_activities_deal ON crm.activities(deal_id);
CREATE INDEX crm_idx_activities_type ON crm.activities(activity_type);
CREATE INDEX crm_idx_tasks_related ON crm.tasks(related_to_type, related_to_id);
CREATE INDEX crm_idx_tasks_assigned ON crm.tasks(assigned_to);
CREATE INDEX crm_idx_tasks_status ON crm.tasks(status);

-- ============================================================================
-- Indexes (Finance Schema)
-- ============================================================================

CREATE INDEX finance_idx_accounts_org ON finance.accounts(organization_id);
CREATE INDEX finance_idx_transactions_org ON finance.transactions(organization_id);
CREATE INDEX finance_idx_transactions_account ON finance.transactions(account_id);
CREATE INDEX finance_idx_transactions_date ON finance.transactions(transaction_date DESC);
CREATE INDEX finance_idx_invoices_org ON finance.invoices(organization_id);
CREATE INDEX finance_idx_invoices_customer ON finance.invoices(customer_id);
CREATE INDEX finance_idx_invoices_status ON finance.invoices(status);
CREATE INDEX finance_idx_invoices_due ON finance.invoices(due_date);
CREATE INDEX finance_idx_expenses_org ON finance.expenses(organization_id);
CREATE INDEX finance_idx_expenses_category ON finance.expenses(category);
CREATE INDEX finance_idx_expenses_date ON finance.expenses(expense_date DESC);
CREATE INDEX finance_idx_budgets_org ON finance.budgets(organization_id);
CREATE INDEX finance_idx_budgets_year ON finance.budgets(fiscal_year);

-- ============================================================================
-- Indexes (Inventory Schema)
-- ============================================================================

CREATE INDEX inv_idx_products_org ON inventory.products(organization_id);
CREATE INDEX inv_idx_products_category ON inventory.products(category_id);
CREATE INDEX inv_idx_products_sku ON inventory.products(sku);
CREATE INDEX inv_idx_inventory_warehouse ON inventory.inventory_items(warehouse_id);
CREATE INDEX inv_idx_inventory_product ON inventory.inventory_items(product_id);
CREATE INDEX inv_idx_movements_org ON inventory.stock_movements(organization_id);
CREATE INDEX inv_idx_movements_product ON inventory.stock_movements(product_id);
CREATE INDEX inv_idx_movements_date ON inventory.stock_movements(created_at DESC);
CREATE INDEX inv_idx_suppliers_org ON inventory.suppliers(organization_id);
CREATE INDEX inv_idx_po_org ON inventory.purchase_orders(organization_id);
CREATE INDEX inv_idx_po_supplier ON inventory.purchase_orders(supplier_id);
CREATE INDEX inv_idx_po_status ON inventory.purchase_orders(status);

-- ============================================================================
-- Indexes (Projects Schema)
-- ============================================================================

CREATE INDEX proj_idx_projects_org ON projects.projects(organization_id);
CREATE INDEX proj_idx_projects_status ON projects.projects(project_status);
CREATE INDEX proj_idx_projects_manager ON projects.projects(project_manager_id);
CREATE INDEX proj_idx_teams_project ON projects.project_teams(project_id);
CREATE INDEX proj_idx_teams_user ON projects.project_teams(user_id);
CREATE INDEX proj_idx_milestones_project ON projects.milestones(project_id);
CREATE INDEX proj_idx_tasks_project ON projects.tasks(project_id);
CREATE INDEX proj_idx_tasks_assignee ON projects.tasks(assignee_id);
CREATE INDEX proj_idx_tasks_status ON projects.tasks(task_status);
CREATE INDEX proj_idx_tasks_parent ON projects.tasks(parent_task_id);
CREATE INDEX proj_idx_time_entries_task ON projects.time_entries(task_id);
CREATE INDEX proj_idx_time_entries_user ON projects.time_entries(user_id);
CREATE INDEX proj_idx_time_entries_date ON projects.time_entries(date DESC);

-- ============================================================================
-- Views
-- ============================================================================

CREATE OR REPLACE VIEW public.v_user_summary AS
SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.status,
       o.name AS organization_name,
       ARRAY_AGG(ur.role) AS roles,
       u.last_login_at,
       COUNT(DISTINCT us.id) AS active_sessions
FROM public.users u
JOIN public.organizations o ON u.organization_id = o.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.user_sessions us ON u.id = us.user_id AND us.is_active = true
WHERE u.status = 'active'
GROUP BY u.id, u.email, u.username, u.first_name, u.last_name, u.status, o.name, u.last_login_at;

CREATE OR REPLACE VIEW hr.v_employee_directory AS
SELECT e.id, e.employee_number, e.first_name, e.last_name,
       e.department, e.position, e.job_title, e.status,
       e.hire_date, e.salary,
       m.first_name || ' ' || m.last_name AS manager_name,
       u.email, u.phone, u.avatar_url,
       l.name AS work_location
FROM hr.employees e
JOIN public.users u ON e.user_id = u.id
LEFT JOIN hr.employees m ON e.manager_id = m.id
LEFT JOIN public.locations l ON e.work_location_id = l.id
WHERE e.status IN ('active', 'on_probation');

CREATE OR REPLACE VIEW hr.v_attendance_summary AS
SELECT e.id, e.employee_number, e.first_name, e.last_name,
       EXTRACT(YEAR FROM a.date) AS year,
       EXTRACT(MONTH FROM a.date) AS month,
       COUNT(*) AS days_present,
       SUM(a.total_worked_minutes) / 60.0 AS total_hours_worked,
       AVG(a.total_worked_minutes) / 60.0 AS avg_daily_hours
FROM hr.employees e
JOIN hr.attendance a ON e.id = a.employee_id
WHERE a.status = 'present' AND a.total_worked_minutes > 0
GROUP BY e.id, e.employee_number, e.first_name, e.last_name, EXTRACT(YEAR FROM a.date), EXTRACT(MONTH FROM a.date)
ORDER BY year DESC, month DESC;

CREATE OR REPLACE VIEW crm.v_pipeline_summary AS
SELECT d.deal_stage,
       COUNT(*) AS deal_count,
       SUM(d.amount) AS total_amount,
       SUM(d.weighted_amount) AS weighted_amount,
       AVG(d.probability) AS avg_probability,
       AVG(EXTRACT(DAY FROM (d.expected_close_date - CURRENT_DATE))) AS avg_days_to_close
FROM crm.deals d
WHERE d.deal_stage NOT IN ('closed_won', 'closed_lost')
GROUP BY d.deal_stage
ORDER BY
    CASE d.deal_stage
        WHEN 'prospecting' THEN 1
        WHEN 'qualification' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
    END;

CREATE OR REPLACE VIEW crm.v_customer_summary AS
SELECT c.id, c.company_name, c.first_name, c.last_name,
       c.customer_type, c.tier,
       c.email, c.phone,
       u.first_name || ' ' || u.last_name AS assigned_to_name,
       COUNT(DISTINCT d.id) AS total_deals,
       COUNT(DISTINCT CASE WHEN d.deal_stage = 'closed_won' THEN d.id END) AS won_deals,
       SUM(CASE WHEN d.deal_stage = 'closed_won' THEN d.amount ELSE 0 END) AS total_revenue,
       MAX(d.actual_close_date) AS last_purchase_date
FROM crm.customers c
LEFT JOIN public.users u ON c.assigned_to = u.id
LEFT JOIN crm.deals d ON c.id = d.customer_id
GROUP BY c.id, c.company_name, c.first_name, c.last_name, c.customer_type, c.tier, c.email, c.phone, u.first_name, u.last_name;

CREATE OR REPLACE VIEW finance.v_revenue_summary AS
SELECT
    EXTRACT(YEAR FROM i.invoice_date) AS year,
    EXTRACT(MONTH FROM i.invoice_date) AS month,
    COUNT(*) AS invoice_count,
    SUM(i.total_amount) AS total_invoiced,
    SUM(i.paid_amount) AS total_paid,
    SUM(i.balance_due) AS outstanding,
    SUM(CASE WHEN i.status = 'overdue' THEN i.balance_due ELSE 0 END) AS overdue_amount
FROM finance.invoices i
WHERE i.invoice_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
GROUP BY EXTRACT(YEAR FROM i.invoice_date), EXTRACT(MONTH FROM i.invoice_date)
ORDER BY year DESC, month DESC;

CREATE OR REPLACE VIEW finance.v_expense_summary AS
SELECT
    EXTRACT(YEAR FROM e.expense_date) AS year,
    EXTRACT(MONTH FROM e.expense_date) AS month,
    e.category,
    COUNT(*) AS expense_count,
    SUM(e.amount) AS total_expenses
FROM finance.expenses e
WHERE e.expense_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
    AND e.status = 'approved'
GROUP BY EXTRACT(YEAR FROM e.expense_date), EXTRACT(MONTH FROM e.expense_date), e.category
ORDER BY year DESC, month DESC, total_expenses DESC;

CREATE OR REPLACE VIEW inventory.v_low_stock_alert AS
SELECT ii.id, ii.warehouse_id, w.warehouse_name,
       ii.product_id, p.product_name, p.sku,
       ii.quantity_on_hand, ii.quantity_allocated, ii.quantity_available,
       ii.reorder_point,
       (ii.quantity_available - ii.reorder_point) AS below_reorder_by,
       p.unit_of_measure
FROM inventory.inventory_items ii
JOIN inventory.warehouses w ON ii.warehouse_id = w.id
JOIN inventory.products p ON ii.product_id = p.id
WHERE ii.quantity_available < ii.reorder_point
    AND w.is_active = true
    AND p.is_active = true
ORDER BY (ii.quantity_available - ii.reorder_point) ASC;

CREATE OR REPLACE VIEW inventory.v_stock_value AS
SELECT
    w.id AS warehouse_id,
    w.warehouse_name,
    COUNT(DISTINCT ii.product_id) AS unique_products,
    SUM(ii.quantity_on_hand) AS total_units,
    SUM(ii.quantity_on_hand * p.cost_price) AS total_cost_value,
    SUM(ii.quantity_on_hand * p.selling_price) AS total_retail_value
FROM inventory.warehouses w
JOIN inventory.inventory_items ii ON w.id = ii.warehouse_id
JOIN inventory.products p ON ii.product_id = p.id
WHERE w.is_active = true
GROUP BY w.id, w.warehouse_name;

CREATE OR REPLACE VIEW projects.v_project_dashboard AS
SELECT
    p.id, p.project_code, p.project_name, p.project_status,
    p.start_date, p.end_date, p.completion_percent,
    p.estimated_hours, p.actual_hours,
    p.budget, p.actual_cost,
    (p.budget - COALESCE(p.actual_cost, 0)) AS remaining_budget,
    COUNT(DISTINCT pt.user_id) AS team_size,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.task_status = 'done' THEN t.id END) AS completed_tasks,
    u.first_name || ' ' || u.last_name AS project_manager_name
FROM projects.projects p
LEFT JOIN projects.project_teams pt ON p.id = pt.project_id AND pt.is_active = true
LEFT JOIN projects.tasks t ON p.id = t.project_id
LEFT JOIN public.users u ON p.project_manager_id = u.id
GROUP BY p.id, p.project_code, p.project_name, p.project_status, p.start_date, p.end_date,
         p.completion_percent, p.estimated_hours, p.actual_hours, p.budget, p.actual_cost,
         u.first_name, u.last_name;

CREATE OR REPLACE VIEW projects.v_task_status_summary AS
SELECT
    p.id AS project_id,
    p.project_name,
    t.task_status,
    COUNT(*) AS task_count,
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours
FROM projects.projects p
LEFT JOIN projects.tasks t ON p.id = t.project_id
GROUP BY p.id, p.project_name, t.task_status
ORDER BY p.id, p.project_name;

-- ============================================================================
-- Sample Data (Organizations and Users)
-- ============================================================================

INSERT INTO public.organizations (id, name, legal_name, tax_id, industry, company_size, founded_date) VALUES
(1, 'Acme Corp', 'Acme Corporation Ltd', 'TX123456789', 'Technology', '51-200', '2010-03-15'),
(2, 'Global Tech', 'Global Technology Solutions Inc', 'NY987654321', 'Software', '201-500', '2008-07-22'),
(3, 'Innovate Ltd', 'Innovate Solutions Ltd', 'CA456789123', 'Consulting', '11-50', '2015-01-10');

SELECT setval('public.organizations_id_seq', 3);

INSERT INTO public.locations (id, organization_id, name, location_type, address_line1, city, state_province, postal_code, country_code) VALUES
(1, 1, 'Acme HQ', 'headquarters', '123 Business Park', 'San Francisco', 'CA', '94105', 'US'),
(2, 1, 'Acme New York', 'branch', '456 Fifth Avenue', 'New York', 'NY', '10001', 'US'),
(3, 2, 'Global HQ', 'headquarters', '789 Tech Center', 'Seattle', 'WA', '98101', 'US'),
(4, 3, 'Innovate HQ', 'headquarters', '321 Innovation Dr', 'Austin', 'TX', '78701', 'US');

SELECT setval('public.locations_id_seq', 4);

INSERT INTO public.users (id, organization_id, location_id, email, username, password_hash, first_name, last_name, status, email_verified_at) VALUES
(1, 1, 1, 'admin@acme.com', 'admin', '$2b$12$hash', 'System', 'Admin', 'active', '2024-01-01 00:00:00'),
(2, 1, 1, 'john.smith@acme.com', 'jsmith', '$2b$12$hash', 'John', 'Smith', 'active', '2024-01-01 00:00:00'),
(3, 1, 1, 'sarah.jones@acme.com', 'sjones', '$2b$12$hash', 'Sarah', 'Jones', 'active', '2024-01-01 00:00:00'),
(4, 1, 2, 'mike.wilson@acme.com', 'mwilson', '$2b$12$hash', 'Mike', 'Wilson', 'active', '2024-01-01 00:00:00'),
(5, 1, 2, 'emily.davis@acme.com', 'edavis', '$2b$12$hash', 'Emily', 'Davis', 'active', '2024-01-01 00:00:00'),
(6, 1, 1, 'david.brown@acme.com', 'dbrown', '$2b$12$hash', 'David', 'Brown', 'active', '2024-01-01 00:00:00'),
(7, 1, 1, 'lisa.garcia@acme.com', 'lgarcia', '$2b$12$hash', 'Lisa', 'Garcia', 'active', '2024-01-01 00:00:00'),
(8, 1, 2, 'kevin.martinez@acme.com', 'kmartinez', '$2b$12$hash', 'Kevin', 'Martinez', 'active', '2024-01-01 00:00:00'),
(9, 1, 1, 'amanda.taylor@acme.com', 'ataylor', '$2b$12$hash', 'Amanda', 'Taylor', 'active', '2024-01-01 00:00:00'),
(10, 1, 2, 'robert.anderson@acme.com', 'randerson', '$2b$12$hash', 'Robert', 'Anderson', 'active', '2024-01-01 00:00:00'),
(11, 2, 3, 'admin@globaltech.com', 'gtadmin', '$2b$12$hash', 'Global', 'Admin', 'active', '2024-01-01 00:00:00'),
(12, 3, 4, 'admin@innovate.com', 'invadmin', '$2b$12$hash', 'Innovate', 'Admin', 'active', '2024-01-01 00:00:00');

SELECT setval('public.users_id_seq', 12);

INSERT INTO public.user_roles (user_id, role) VALUES
(1, 'super_admin'),
(2, 'admin'),
(3, 'manager'),
(4, 'manager'),
(5, 'supervisor'),
(6, 'user'),
(7, 'user'),
(8, 'user'),
(9, 'user'),
(10, 'user'),
(11, 'super_admin'),
(12, 'super_admin');

-- ============================================================================
-- Sample Data (HR)
-- ============================================================================

INSERT INTO hr.employees (id, user_id, employee_number, first_name, last_name, department, employment_type, status, hire_date, salary, work_location_id) VALUES
(1, 2, 'EMP001', 'John', 'Smith', 'executive', 'full_time', 'active', '2020-01-15', 150000.00, 1),
(2, 3, 'EMP002', 'Sarah', 'Jones', 'hr', 'full_time', 'active', '2020-03-01', 85000.00, 1),
(3, 4, 'EMP003', 'Mike', 'Wilson', 'sales', 'full_time', 'active', '2020-05-15', 95000.00, 2),
(4, 5, 'EMP004', 'Emily', 'Davis', 'sales', 'full_time', 'active', '2021-02-01', 75000.00, 2),
(5, 6, 'EMP005', 'David', 'Brown', 'it', 'full_time', 'active', '2021-04-15', 110000.00, 1),
(6, 7, 'EMP006', 'Lisa', 'Garcia', 'finance', 'full_time', 'active', '2021-06-01', 90000.00, 1),
(7, 8, 'EMP007', 'Kevin', 'Martinez', 'operations', 'full_time', 'active', '2022-01-15', 70000.00, 2),
(8, 9, 'EMP008', 'Amanda', 'Taylor', 'it', 'full_time', 'active', '2022-03-01', 95000.00, 1),
(9, 10, 'EMP009', 'Robert', 'Anderson', 'marketing', 'full_time', 'active', '2022-05-15', 80000.00, 2);

SELECT setval('hr.employees_id_seq', 9);

INSERT INTO hr.employees (employee_number, first_name, last_name, department, employment_type, status, hire_date, salary) VALUES
('EMP010', 'Jennifer', 'Thomas', 'customer_service', 'full_time', 'active', '2022-07-01', 55000.00),
('EMP011', 'Michael', 'Jackson', 'it', 'contract', 'active', '2022-09-15', 65000.00),
('EMP012', 'Jessica', 'White', 'sales', 'full_time', 'active', '2022-11-01', 88000.00),
('EMP013', 'Daniel', 'Harris', 'operations', 'full_time', 'active', '2023-01-15', 68000.00),
('EMP014', 'Laura', 'Martin', 'hr', 'full_time', 'active', '2023-03-01', 72000.00),
('EMP015', 'James', 'Thompson', 'finance', 'full_time', 'active', '2023-05-15', 82000.00),
('EMP016', 'Sarah', 'Garcia', 'marketing', 'full_time', 'active', '2023-07-01', 78000.00),
('EMP017', 'Christopher', 'Robinson', 'production', 'full_time', 'active', '2023-09-15', 65000.00),
('EMP018', 'Nicole', 'Clark', 'logistics', 'full_time', 'active', '2023-11-01', 62000.00),
('EMP019', 'Ryan', 'Rodriguez', 'it', 'full_time', 'active', '2024-01-15', 72000.00),
('EMP020', 'Ashley', 'Lewis', 'sales', 'full_time', 'on_probation', '2024-02-01', 70000.00);

UPDATE hr.employees SET manager_id = 1 WHERE department IN ('hr', 'finance', 'it', 'sales', 'marketing', 'operations', 'customer_service', 'production', 'logistics');
UPDATE hr.employees SET manager_id = 2 WHERE department = 'customer_service';
UPDATE hr.employees SET manager_id = 3 WHERE department = 'sales' AND id != 3;
UPDATE hr.employees SET manager_id = 5 WHERE department = 'it' AND id != 5;
UPDATE hr.employees SET manager_id = 6 WHERE department = 'finance' AND id != 6;
UPDATE hr.employees SET manager_id = 7 WHERE department = 'operations' AND id != 7;
UPDATE hr.employees SET manager_id = 9 WHERE department = 'marketing' AND id != 9;
UPDATE hr.employees SET manager_id = 17 WHERE department = 'production';
UPDATE hr.employees SET manager_id = 18 WHERE department = 'logistics';

INSERT INTO hr.time_off_types (name, description, default_allowance, is_paid) VALUES
('Annual Leave', 'Regular vacation time', 20, true),
('Sick Leave', 'Paid sick leave', 10, true),
('Personal Days', 'Personal business days', 5, true),
('Bereavement', 'Family bereavement', 5, true),
('Unpaid Leave', 'Unpaid time off', 0, false),
('Parental Leave', 'Maternity/paternity leave', 90, true);

-- Generate attendance records for the past 90 days
INSERT INTO hr.attendance (employee_id, date, clock_in_time, clock_out_time, total_worked_minutes, status)
SELECT
    e.id,
    CURRENT_DATE - (random() * 90)::int,
    (CURRENT_DATE - (random() * 90)::int)::date + TIME '08:30:00' + (random() * INTERVAL '15 minutes'),
    (CURRENT_DATE - (random() * 90)::int)::date + TIME '17:30:00' - (random() * INTERVAL '30 minutes'),
    540 - floor(random() * 60)::int,
    CASE WHEN random() > 0.1 THEN 'present' ELSE 'absent' END
FROM hr.employees e
CROSS JOIN LATERAL generate_series(1, 70 + floor(random() * 20)::int) AS gs
WHERE e.status = 'active'
ORDER BY e.id, gs;

-- ============================================================================
-- Sample Data (CRM)
-- ============================================================================

INSERT INTO crm.customers (organization_id, customer_type, tier, company_name, first_name, last_name, email, phone, assigned_to, tags) VALUES
(1, 'business', 'gold', 'TechStart Inc', 'James', 'Chen', 'james@techstart.com', '+1-555-0001', 3, '["enterprise", "tech"]'),
(1, 'business', 'platinum', 'Digital Solutions LLC', 'Maria', 'Garcia', 'maria@digitalsolutions.com', '+1-555-0002', 3, '["enterprise", "repeat-customer"]'),
(1, 'business', 'silver', 'Cloud Nine Systems', 'Robert', 'Kim', 'robert@cloudnine.com', '+1-555-0003', 4, '["tech", "cloud"]'),
(1, 'individual', 'standard', NULL, 'Alice', 'Johnson', 'alice.johnson@email.com', '+1-555-0004', 5, '["individual"]'),
(1, 'business', 'gold', 'Innovate Corp', 'Michael', 'Wang', 'michael@innovatecorp.com', '+1-555-0005', 4, '["enterprise", "startup"]'),
(1, 'business', 'silver', 'NextGen Tech', 'Sarah', 'Lee', 'sarah@nextgentech.com', '+1-555-0006', 3, '["tech", "startup"]'),
(1, 'individual', 'bronze', NULL, 'David', 'Martinez', 'david.martinez@email.com', '+1-555-0007', 5, '["individual"]'),
(1, 'business', 'standard', 'Global Innovations', 'Jennifer', 'Wilson', 'jennifer@globalinnovations.com', '+1-555-0008', 4, '["enterprise"]'),
(1, 'individual', 'gold', NULL, 'Thomas', 'Brown', 'thomas.brown@email.com', '+1-555-0009', 3, '["vip", "individual"]'),
(1, 'business', 'silver', 'Future Systems', 'Emily', 'Davis', 'emily@futuresystems.com', '+1-555-0010', 3, '["tech", "startup"]');

INSERT INTO crm.contacts (customer_id, first_name, last_name, job_title, department, email, phone, is_primary) VALUES
(1, 'James', 'Chen', 'CTO', 'Technology', 'james@techstart.com', '+1-555-0001', true),
(1, 'Lisa', 'Park', 'VP Engineering', 'Technology', 'lisa@techstart.com', '+1-555-0011', false),
(2, 'Maria', 'Garcia', 'CEO', 'Executive', 'maria@digitalsolutions.com', '+1-555-0002', true),
(2, 'Carlos', 'Rodriguez', 'CFO', 'Finance', 'carlos@digitalsolutions.com', '+1-555-0012', false),
(3, 'Robert', 'Kim', 'Director of IT', 'IT', 'robert@cloudnine.com', '+1-555-0003', true),
(4, 'Alice', 'Johnson', NULL, NULL, 'alice.johnson@email.com', '+1-555-0004', true),
(5, 'Michael', 'Wang', 'Founder', 'Executive', 'michael@innovatecorp.com', '+1-555-0005', true);

INSERT INTO crm.leads (organization_id, customer_id, title, company_name, lead_status, estimated_value, probability, assigned_to) VALUES
(1, 11, 'Enterprise Software License', 'Enterprise Solutions Inc', 'proposal', 500000.00, 75, 3),
(1, 12, 'Cloud Migration Project', 'CloudFirst Corp', 'qualified', 250000.00, 50, 4),
(1, NULL, 'Data Analytics Platform', 'DataDriven Inc', 'new', 150000.00, 20, 3),
(1, 13, 'Security Assessment', 'SecureTech LLC', 'negotiation', 75000.00, 80, 4),
(1, NULL, 'AI Integration Services', 'FutureAI Corp', 'contacted', 300000.00, 30, 3);

INSERT INTO crm.deals (customer_id, deal_number, deal_name, deal_stage, amount, probability, expected_close_date, assigned_to) VALUES
(1, 'D001', 'TechStart Annual License', 'closed_won', 120000.00, 100, '2024-01-15', 3),
(2, 'D002', 'Digital Solutions Premium', 'closed_won', 250000.00, 100, '2024-01-20', 3),
(3, 'D003', 'Cloud Nine Migration', 'proposal', 180000.00, 60, '2024-03-15', 4),
(5, 'D004', 'Innovate Corp Platform', 'negotiation', 200000.00, 80, '2024-02-28', 4),
(9, 'D005', 'Thomas Brown Enterprise', 'closed_won', 45000.00, 100, '2024-01-25', 3),
(10, 'D006', 'Future Systems Contract', 'qualification', 95000.00, 40, '2024-04-30', 3);

INSERT INTO crm.deal_items (deal_id, name, quantity, unit_price, discount_percent, total_amount) VALUES
(1, 'Enterprise License (Annual)', 1, 100000.00, 10, 90000.00),
(1, 'Premium Support', 1, 30000.00, 0, 30000.00),
(2, 'Platform License', 1, 200000.00, 0, 200000.00),
(2, 'Implementation Services', 1, 50000.00, 0, 50000.00),
(3, 'Cloud Migration Service', 1, 150000.00, 10, 135000.00),
(3, 'Data Migration', 1, 50000.00, 0, 50000.00);

-- ============================================================================
-- Sample Data (Finance)
-- ============================================================================

INSERT INTO finance.chart_of_accounts (organization_id, account_number, account_name, account_type, account_category) VALUES
(1, '1000', 'Cash and Cash Equivalents', 'asset', 'current_assets'),
(1, '1100', 'Accounts Receivable', 'asset', 'current_assets'),
(1, '1200', 'Inventory', 'asset', 'current_assets'),
(1, '2000', 'Accounts Payable', 'liability', 'current_liabilities'),
(1, '3000', 'Revenue', 'equity', 'revenue'),
(1, '4000', 'Cost of Goods Sold', 'expense', 'direct_costs'),
(1, '5000', 'Salaries and Wages', 'expense', 'operating_expenses'),
(1, '6000', 'Rent Expense', 'expense', 'operating_expenses'),
(1, '7000', 'Marketing Expenses', 'expense', 'operating_expenses'),
(1, '8000', 'Software and Technology', 'expense', 'operating_expenses');

INSERT INTO finance.accounts (organization_id, account_number, account_name, account_type, balance) VALUES
(1, '1001', 'Business Checking Account', 'asset', 250000.00),
(1, '1002', 'Savings Account', 'asset', 100000.00),
(1, '1101', 'Accounts Receivable', 'asset', 150000.00),
(1, '2001', 'Accounts Payable', 'liability', 45000.00);

INSERT INTO finance.invoices (organization_id, invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, status, paid_amount) VALUES
(1, 'INV-2024-001', 1, '2024-01-15', '2024-02-15', 90909.09, 9090.91, 100000.00, 'paid', 100000.00),
(1, 'INV-2024-002', 2, '2024-01-20', '2024-02-20', 208333.33, 41666.67, 250000.00, 'paid', 250000.00),
(1, 'INV-2024-003', 1, '2024-02-01', '2024-03-01', 50000.00, 5000.00, 55000.00, 'partial', 27500.00),
(1, 'INV-2024-004', 3, '2024-02-10', '2024-03-10', 163636.36, 16363.64, 180000.00, 'sent', 0),
(1, 'INV-2024-005', 9, '2024-01-25', '2024-02-25', 40909.09, 4090.91, 45000.00, 'paid', 45000.00);

INSERT INTO finance.invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES
(1, 'Enterprise License (Annual) - 10% discount applied', 1, 90909.09, 90909.09),
(2, 'Platform License', 1, 200000.00, 200000.00),
(2, 'Implementation Services', 1, 50000.00, 50000.00),
(3, 'Quarterly Support Services', 1, 50000.00, 50000.00),
(5, 'Individual Enterprise License', 1, 40909.09, 40909.09);

INSERT INTO finance.expenses (organization_id, category, amount, expense_date, vendor_name, status, employee_id) VALUES
(1, 'salary', 150000.00, '2024-01-31', 'Acme Corp Payroll', 'approved', 1),
(1, 'salary', 85000.00, '2024-01-31', 'Acme Corp Payroll', 'approved', 2),
(1, 'salary', 95000.00, '2024-01-31', 'Acme Corp Payroll', 'approved', 3),
(1, 'rent', 15000.00, '2024-01-01', 'SF Properties LLC', 'approved', NULL),
(1, 'utilities', 2500.00, '2024-01-15', 'Pacific Gas & Electric', 'approved', NULL),
(1, 'software', 5000.00, '2024-01-10', 'Microsoft', 'approved', NULL),
(1, 'software', 3000.00, '2024-01-15', 'Salesforce', 'approved', NULL),
(1, 'marketing', 25000.00, '2024-01-20', 'Digital Marketing Agency', 'approved', NULL),
(1, 'travel', 3500.00, '2024-01-25', 'Various Airlines', 'approved', 3),
(1, 'insurance', 8000.00, '2024-01-01', 'Business Insurance Co', 'approved', NULL);

-- More expense records for different months
INSERT INTO finance.expenses (organization_id, category, amount, expense_date, vendor_name, status)
SELECT 1, category, (random() * 20000 + 1000)::numeric(12, 2),
       ('2024-02-01'::date + (random() * 28)::int),
       'Vendor ' || (floor(random() * 50) + 1),
       'approved'
FROM generate_series(1, 15)
CROSS JOIN (VALUES ('salary'), ('rent'), ('utilities'), ('marketing'), ('software'), ('hardware')) AS t(category);

-- ============================================================================
-- Sample Data (Inventory)
-- ============================================================================

INSERT INTO inventory.warehouses (organization_id, location_id, warehouse_code, warehouse_name, warehouse_type, capacity, manager_id) VALUES
(1, 1, 'WH-SF', 'San Francisco Warehouse', 'main', 10000.00, 7),
(1, 2, 'WH-NY', 'New York Warehouse', 'branch', 5000.00, NULL),
(1, 1, 'WH-TEMP', 'Temporary Storage', 'temporary', 2000.00, NULL);

INSERT INTO inventory.categories (organization_id, category_code, category_name, description, sort_order) VALUES
(1, 'CAT001', 'Electronics', 'Electronic devices and components', 1),
(1, 'CAT002', 'Computers', 'Computers and peripherals', 2),
(1, 'CAT003', 'Software', 'Software licenses and digital products', 3),
(1, 'CAT004', 'Office Supplies', 'Office supplies and consumables', 4),
(1, 'CAT005', 'Furniture', 'Office furniture and equipment', 5);

INSERT INTO inventory.products (organization_id, category_id, sku, product_name, product_type, unit_of_measure, cost_price, selling_price, weight) VALUES
(1, 2, 'LAPTOP-001', 'Business Laptop Pro', 'finished_good', 'each', 800.00, 1299.99, 1.8),
(1, 2, 'LAPTOP-002', 'Workstation Laptop', 'finished_good', 'each', 1200.00, 1899.99, 2.2),
(1, 2, 'MONITOR-001', '27" 4K Monitor', 'finished_good', 'each', 350.00, 549.99, 6.5),
(1, 1, 'TABLET-001', 'Business Tablet', 'finished_good', 'each', 250.00, 449.99, 0.5),
(1, 3, 'SOFT-001', 'Enterprise Software License', 'digital', 'license', 0, 50000.00, 0),
(1, 3, 'SOFT-002', 'Cloud Storage (TB/year)', 'digital', 'tb_year', 50, 1200.00, 0),
(1, 4, 'OFFICE-001', 'A4 Paper Box (500 sheets)', 'consumable', 'box', 20, 45.00, 2.5),
(1, 4, 'OFFICE-002', 'Ballpoint Pen Pack', 'consumable', 'pack', 5, 12.00, 0.2),
(1, 5, 'FURN-001', 'Ergonomic Office Chair', 'finished_good', 'each', 200.00, 399.99, 15.0),
(1, 5, 'FURN-002', 'Adjustable Desk', 'finished_good', 'each', 300.00, 599.99, 25.0);

INSERT INTO inventory.inventory_items (warehouse_id, product_id, quantity_on_hand, quantity_allocated, reorder_point) VALUES
(1, 1, 45, 0, 10),
(1, 2, 25, 0, 10),
(1, 3, 80, 0, 20),
(1, 4, 60, 0, 15),
(1, 7, 200, 0, 50),
(1, 8, 500, 0, 100),
(1, 9, 35, 0, 10),
(2, 1, 20, 0, 10),
(2, 3, 40, 0, 20),
(2, 4, 30, 0, 15);

INSERT INTO inventory.suppliers (organization_id, supplier_code, supplier_name, contact_person, email, phone, payment_terms) VALUES
(1, 'SUP001', 'TechWholesale Inc', 'John Supplier', 'john@techwholesale.com', '+1-555-1001', 30),
(1, 'SUP002', 'OfficeDepot Pro', 'Mary Supplies', 'mary@officedepotpro.com', '+1-555-1002', 15),
(1, 'SUP003', 'Furniture Plus', 'Tom Furn', 'tom@furnitureplus.com', '+1-555-1003', 45),
(1, 'SUP004', 'Digital Goods Corp', 'Alice Digital', 'alice@digitalgoods.com', '+1-555-1004', 0);

INSERT INTO inventory.purchase_orders (organization_id, supplier_id, warehouse_id, order_number, order_date, status, subtotal, total_amount) VALUES
(1, 1, 1, 'PO-2024-001', '2024-01-15', 'completed', 30000.00, 33000.00),
(1, 2, 1, 'PO-2024-002', '2024-01-20', 'completed', 5000.00, 5500.00),
(1, 3, 1, 'PO-2024-003', '2024-02-01', 'processing', 12000.00, 13200.00),
(1, 1, 2, 'PO-2024-004', '2024-02-10', 'draft', 15000.00, 16500.00);

INSERT INTO inventory.purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, line_total, received_quantity) VALUES
(1, 1, 'Business Laptop Pro x 25', 25, 1000.00, 25000.00, 25),
(1, 2, 'Workstation Laptop x 5', 5, 1400.00, 7000.00, 5),
(2, 7, 'A4 Paper Box x 100', 100, 45.00, 4500.00, 100),
(2, 8, 'Ballpoint Pen Pack x 80', 80, 12.00, 960.00, 80),
(3, 9, 'Ergonomic Office Chair x 30', 30, 300.00, 9000.00, 0),
(3, 10, 'Adjustable Desk x 10', 10, 400.00, 4000.00, 0);

-- ============================================================================
-- Sample Data (Projects)
-- ============================================================================

INSERT INTO projects.projects (organization_id, project_code, project_name, description, project_status, project_manager_id, start_date, end_date, estimated_hours, budget) VALUES
(1, 'PRJ-001', 'Enterprise CRM Implementation', 'Implement new CRM system for enterprise clients', 'active', 5, '2024-01-15', '2024-06-30', 2000.00, 250000.00),
(1, 'PRJ-002', 'Cloud Migration', 'Migrate on-premise infrastructure to cloud', 'active', 6, '2024-02-01', '2024-08-15', 3000.00, 400000.00),
(1, 'PRJ-003', 'Mobile App Development', 'Develop customer-facing mobile application', 'planning', 8, '2024-03-01', '2024-09-30', 1500.00, 200000.00),
(1, 'PRJ-004', 'Data Analytics Platform', 'Build enterprise data analytics platform', 'active', 5, '2024-01-01', '2024-05-31', 1800.00, 300000.00);

INSERT INTO projects.project_teams (project_id, user_id, role, hourly_rate) VALUES
(1, 6, 'Project Manager', 150.00),
(1, 5, 'Lead Developer', 130.00),
(1, 8, 'Backend Developer', 110.00),
(1, 10, 'Frontend Developer', 100.00),
(2, 6, 'Project Manager', 150.00),
(2, 5, 'Cloud Architect', 140.00),
(2, 7, 'DevOps Engineer', 120.00),
(3, 8, 'Project Manager', 140.00),
(4, 5, 'Project Manager', 150.00),
(4, 8, 'Lead Developer', 130.00);

INSERT INTO projects.milestones (project_id, milestone_name, target_date, status) VALUES
(1, 'Requirements Finalized', '2024-01-31', 'completed'),
(1, 'Design Phase Complete', '2024-02-28', 'completed'),
(1, 'Development Sprint 1', '2024-03-31', 'completed'),
(1, 'Development Sprint 2', '2024-04-30', 'completed'),
(1, 'Testing & QA', '2024-05-31', 'in_progress'),
(1, 'Go-Live', '2024-06-30', 'pending'),
(2, 'Infrastructure Setup', '2024-02-28', 'completed'),
(2, 'Data Migration', '2024-05-31', 'in_progress'),
(2, 'Application Migration', '2024-07-31', 'pending'),
(4, 'Requirements Analysis', '2024-01-31', 'completed'),
(4, 'Data Pipeline Build', '2024-03-31', 'completed'),
(4, 'Dashboard Development', '2024-04-30', 'completed'),
(4, 'Testing & Deployment', '2024-05-31', 'in_progress');

INSERT INTO projects.tasks (project_id, milestone_id, task_number, task_name, task_status, task_priority, assignee_id, estimated_hours, due_date, completion_percent) VALUES
(1, 1, 'T001-001', 'Gather Business Requirements', 'done', 'high', 5, 80.00, '2024-01-20', 100),
(1, 1, 'T001-002', 'Document User Stories', 'done', 'medium', 5, 40.00, '2024-01-25', 100),
(1, 2, 'T001-003', 'System Architecture Design', 'done', 'high', 5, 60.00, '2024-02-20', 100),
(1, 2, 'T001-004', 'Database Schema Design', 'done', 'high', 8, 50.00, '2024-02-25', 100),
(1, 3, 'T001-005', 'API Development - Core Modules', 'done', 'high', 8, 200.00, '2024-03-25', 100),
(1, 3, 'T001-006', 'Frontend Development - Dashboard', 'done', 'medium', 10, 150.00, '2024-03-30', 100),
(1, 4, 'T001-007', 'API Development - Advanced Features', 'done', 'medium', 8, 180.00, '2024-04-25', 100),
(1, 4, 'T001-008', 'Frontend Development - Reports', 'in_progress', 'medium', 10, 120.00, '2024-04-30', 70),
(1, 5, 'T001-009', 'Unit Testing', 'in_progress', 'high', 8, 150.00, '2024-05-20', 60),
(1, 5, 'T001-010', 'Integration Testing', 'todo', 'high', 5, 100.00, '2024-05-25', 0),
(1, 6, 'T001-011', 'Production Deployment', 'todo', 'critical', 5, 40.00, '2024-06-30', 0),
(2, 1, 'T002-001', 'Cloud Architecture Design', 'done', 'high', 5, 80.00, '2024-02-20', 100),
(2, 2, 'T002-002', 'Database Migration Planning', 'in_progress', 'high', 5, 120.00, '2024-05-15', 50),
(2, 2, 'T002-003', 'Data Migration Scripts', 'in_progress', 'high', 7, 200.00, '2024-05-30', 30),
(4, 1, 'T004-001', 'Data Source Analysis', 'done', 'medium', 8, 60.00, '2024-01-25', 100),
(4, 2, 'T004-002', 'ETL Pipeline Development', 'done', 'high', 8, 180.00, '2024-03-25', 100),
(4, 3, 'T004-003', 'Dashboard UI Development', 'done', 'medium', 10, 140.00, '2024-04-25', 100),
(4, 4, 'T004-004', 'Performance Testing', 'in_progress', 'high', 5, 80.00, '2024-05-25', 40);

-- Generate time entries for past tasks
INSERT INTO projects.time_entries (task_id, project_id, user_id, date, hours, description, billable)
SELECT
    t.id,
    t.project_id,
    t.assignee_id,
    CURRENT_DATE - (random() * 60)::int,
    (random() * 4 + 1)::numeric(10, 2),
    'Work on ' || t.task_name,
    true
FROM projects.tasks t
WHERE t.task_status IN ('done', 'in_progress')
    AND t.assignee_id IS NOT NULL
    AND (random() > 0.3 OR t.task_status = 'done');

-- ============================================================================
-- Additional Sample Data Generation
-- ============================================================================

-- More audit logs
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
SELECT
    1 + floor(random() * 10)::int,
    (ARRAY ['create', 'update', 'delete', 'login', 'logout'])[1 + floor(random() * 5)],
    (ARRAY ['users', 'employees', 'customers', 'deals', 'invoices'])[1 + floor(random() * 5)],
    1 + floor(random() * 100)::int,
    NULL,
    '{"key": "value"}'::jsonb,
    NOW() - (random() * INTERVAL '90 days')
FROM generate_series(1, 500);

-- More notifications
INSERT INTO public.notifications (user_id, type, status, subject, data, created_at)
SELECT
    1 + floor(random() * 10)::int,
    (ARRAY ['email', 'in_app', 'system'])[1 + floor(random() * 3)],
    (ARRAY ['sent', 'read', 'pending'])[1 + floor(random() * 3)],
    'Notification ' || gs,
    '{"priority": "normal"}'::jsonb,
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(1, 300) AS gs;

-- More customer records
INSERT INTO crm.customers (organization_id, customer_type, tier, company_name, first_name, last_name, email, phone, assigned_to)
SELECT
    1,
    (ARRAY ['business', 'individual'])[1 + floor(random() * 2)],
    (ARRAY ['standard', 'silver', 'gold', 'bronze'])[1 + floor(random() * 4)],
    CASE WHEN random() > 0.5 THEN 'Company ' || gs ELSE NULL END,
    CASE WHEN random() <= 0.5 THEN (ARRAY ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'])[1 + floor(random() * 6)] ELSE NULL END,
    CASE WHEN random() <= 0.5 THEN (ARRAY ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])[1 + floor(random() * 5)] ELSE NULL END,
    'customer' || gs || '@example.com',
    '+1-555-' || LPAD((10000 + gs)::text, 5, '0'),
    3 + floor(random() * 7)::int
FROM generate_series(11, 100) AS gs;

-- More deal records
INSERT INTO crm.deals (customer_id, deal_number, deal_name, deal_stage, amount, probability, assigned_to, expected_close_date)
SELECT
    11 + floor(random() * 90)::int,
    'D' || LPAD((100 + gs)::text, 4, '0'),
    'Deal ' || gs,
    (ARRAY ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])[1 + floor(random() * 6)],
    (random() * 100000 + 10000)::numeric(12, 2),
    CASE WHEN random() > 0.5 THEN 60 + floor(random() * 40) ELSE floor(random() * 60) END,
    3 + floor(random() * 7)::int,
    CURRENT_DATE + (random() * 120)::int
FROM generate_series(7, 100) AS gs;

-- More transaction records
INSERT INTO finance.transactions (organization_id, account_id, transaction_type, amount, transaction_date, description, category)
SELECT
    1,
    1 + floor(random() * 4)::int,
    (ARRAY ['income', 'expense', 'transfer'])[1 + floor(random() * 3)],
    (random() * 10000 + 100)::numeric(15, 2),
    CURRENT_DATE - (random() * 180)::int,
    'Transaction ' || gs,
    (ARRAY ['sales', 'salary', 'rent', 'utilities', 'other'])[1 + floor(random() * 5)]
FROM generate_series(1, 500) AS gs;

-- More inventory products
INSERT INTO inventory.products (organization_id, category_id, sku, product_name, product_type, unit_of_measure, cost_price, selling_price)
SELECT
    1,
    1 + floor(random() * 5)::int,
    'PROD-' || LPAD((100 + gs)::text, 5, '0'),
    'Product ' || gs,
    'finished_good',
    'each',
    (random() * 500 + 50)::numeric(12, 2),
    (random() * 1000 + 100)::numeric(12, 2)
FROM generate_series(11, 100) AS gs;

-- More stock movements
INSERT INTO inventory.stock_movements (organization_id, warehouse_id, product_id, movement_type, quantity, quantity_before, quantity_after, unit_cost)
SELECT
    1,
    1 + floor(random() * 2)::int,
    1 + floor(random() * 20)::int,
    (ARRAY ['purchase', 'sale', 'transfer', 'adjustment'])[1 + floor(random() * 4)],
    (random() * 50 + 1)::int,
    floor(random() * 100 + 50)::int,
    floor(random() * 100 + 100)::int,
    (random() * 500 + 50)::numeric(12, 2)
FROM generate_series(1, 300) AS gs;

-- More project tasks
INSERT INTO projects.tasks (project_id, task_number, task_name, task_status, task_priority, assignee_id, estimated_hours, due_date)
SELECT
    1 + floor(random() * 4)::int,
    'T' || LPAD((100 + gs)::text, 4, '0'),
    'Task ' || gs,
    (ARRAY ['backlog', 'todo', 'in_progress', 'done', 'testing'])[1 + floor(random() * 5)],
    (ARRAY ['lowest', 'low', 'medium', 'high', 'highest'])[1 + floor(random() * 5)],
    5 + floor(random() * 6)::int,
    (random() * 40 + 5)::numeric(10, 2),
    CURRENT_DATE + (random() * 60)::int
FROM generate_series(50, 200) AS gs;

-- ============================================================================
-- Comments and Activities
-- ============================================================================

INSERT INTO crm.activities (deal_id, activity_type, subject, assigned_to, created_by, start_time, status)
SELECT
    1 + floor(random() * 100)::int,
    (ARRAY ['call', 'email', 'meeting', 'note'])[1 + floor(random() * 4)],
    'Activity ' || gs,
    3 + floor(random() * 7)::int,
    3 + floor(random() * 7)::int,
    NOW() - (random() * INTERVAL '90 days'),
    'completed'
FROM generate_series(1, 200) AS gs;

INSERT INTO projects.task_comments (task_id, user_id, comment_text, created_at)
SELECT
    1 + floor(random() * 200)::int,
    3 + floor(random() * 8)::int,
    'Comment: ' || gs || ' - ' || (ARRAY ['Need clarification', 'Good progress', 'Issue found', 'Ready for review'])[1 + floor(random() * 4)],
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(1, 150) AS gs;

INSERT INTO crm.tasks (organization_id, title, status, priority, assigned_to, due_date)
SELECT
    1,
    'Task ' || gs,
    (ARRAY ['pending', 'in_progress', 'completed'])[1 + floor(random() * 3)],
    (ARRAY ['low', 'medium', 'high'])[1 + floor(random() * 3)],
    3 + floor(random() * 7)::int,
    CURRENT_DATE + (random() * 30)::int
FROM generate_series(1, 100) AS gs;

-- Final statistics
-- Tables: 40+
-- Views: 15
-- Custom Types: 20+
-- Indexes: 50+
-- Estimated rows: 5000+
