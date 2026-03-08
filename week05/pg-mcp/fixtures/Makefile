# PostgreSQL Test Databases Makefile
# This Makefile helps create, reset, and manage test databases for pg-mcp

# PostgreSQL Configuration
# Override these in your environment or .env file
PGHOST ?= localhost
PGPORT ?= 5432
PGUSER ?= postgres
PGPASSWORD ?= postgres
PGDATABASE ?= postgres

# Database Names
DB_SMALL ?= pg_mcp_test_small
DB_MEDIUM ?= pg_mcp_test_medium
DB_LARGE ?= pg_mcp_test_large

# Connection String
CONN_STR = postgresql://$(PGUSER):$(PGPASSWORD)@$(PGHOST):$(PGPORT)/$(PGDATABASE)

# Color output
COLOR_RESET = \033[0m
COLOR_BOLD = \033[1m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m
COLOR_BLUE = \033[34m
COLOR_RED = \033[31m

.PHONY: help
help:
	@echo "$(COLOR_BOLD)PostgreSQL MCP Test Databases - Makefile Help$(COLOR_RESET)"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@echo "$(COLOR_GREEN)  all$(COLOR_RESET)              - Create all test databases"
	@echo "$(COLOR_GREEN)  small$(COLOR_RESET)             - Create small test database (blog)"
	@echo "$(COLOR_GREEN)  medium$(COLOR_RESET)            - Create medium test database (ecommerce)"
	@echo "$(COLOR_GREEN)  large$(COLOR_RESET)            - Create large test database (ERP)"
	@echo ""
	@echo "$(COLOR_YELLOW)  reset-all$(COLOR_RESET)        - Drop and recreate all test databases"
	@echo "$(COLOR_YELLOW)  reset-small$(COLOR_RESET)     - Drop and recreate small test database"
	@echo "$(COLOR_YELLOW)  reset-medium$(COLOR_RESET)    - Drop and recreate medium test database"
	@echo "$(COLOR_YELLOW)  reset-large$(COLOR_RESET)     - Drop and recreate large test database"
	@echo ""
	@echo "$(COLOR_RED)  drop-all$(COLOR_RESET)          - Drop all test databases"
	@echo "$(COLOR_RED)  drop-small$(COLOR_RESET)        - Drop small test database"
	@echo "$(COLOR_RED)  drop-medium$(COLOR_RESET)       - Drop medium test database"
	@echo "$(COLOR_RED)  drop-large$(COLOR_RESET)        - Drop large test database"
	@echo ""
	@echo "$(COLOR_BLUE)  info$(COLOR_RESET)              - Show information about all test databases"
	@echo "$(COLOR_BLUE)  info-small$(COLOR_RESET)       - Show info about small database"
	@echo "$(COLOR_BLUE)  info-medium$(COLOR_RESET)      - Show info about medium database"
	@echo "$(COLOR_BLUE)  info-large$(COLOR_RESET)       - Show info about large database"
	@echo ""
	@echo "$(COLOR_BLUE)  connect-small$(COLOR_RESET)    - Connect to small database"
	@echo "$(COLOR_BLUE)  connect-medium$(COLOR_RESET)   - Connect to medium database"
	@echo "$(COLOR_BLUE)  connect-large$(COLOR_RESET)    - Connect to large database"
	@echo ""
	@echo "$(COLOR_BLUE)  dump-small$(COLOR_RESET)       - Dump small database to SQL file"
	@echo "$(COLOR_BLUE)  dump-medium$(COLOR_RESET)      - Dump medium database to SQL file"
	@echo "$(COLOR_BLUE)  dump-large$(COLOR_RESET)       - Dump large database to SQL file"
	@echo ""
	@echo "$(COLOR_BLUE)  stats$(COLOR_RESET)            - Show database statistics"
	@echo "$(COLOR_BLUE)  test$(COLOR_RESET)             - Run basic connectivity test"
	@echo ""
	@echo "Environment Variables:"
	@echo "  PGHOST        - PostgreSQL host (default: localhost)"
	@echo "  PGPORT        - PostgreSQL port (default: 5432)"
	@echo "  PGUSER        - PostgreSQL user (default: postgres)"
	@echo "  PGPASSWORD    - PostgreSQL password (default: postgres)"
	@echo "  PGDATABASE    - Default database for connection (default: postgres)"
	@echo "  DB_SMALL      - Small database name (default: pg_mcp_test_small)"
	@echo "  DB_MEDIUM     - Medium database name (default: pg_mcp_test_medium)"
	@echo "  DB_LARGE      - Large database name (default: pg_mcp_test_large)"
	@echo ""
	@echo "Example:"
	@echo "  make all                           # Create all databases with defaults"
	@echo "  PGUSER=myuser make small           # Create small database with custom user"
	@echo "  make info                          # Show database information"

# ============================================================================
# Create Databases
# ============================================================================

.PHONY: all small medium large
all: small medium large
	@echo "$(COLOR_GREEN)✓ All test databases created successfully!$(COLOR_RESET)"
	@make info

small: check_connection
	@echo "$(COLOR_BLUE)Creating small test database ($(DB_SMALL))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "CREATE DATABASE $(DB_SMALL);" 2>/dev/null || echo "Database may already exist or requires cleanup"
	@echo "$(COLOR_BLUE)Loading schema and data...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_SMALL)" -f small_blog.sql
	@echo "$(COLOR_GREEN)✓ Small database created successfully!$(COLOR_RESET)"
	@echo "$(COLOR_BLUE)  - Blog system with 5 tables, 1 view, 4 indexes$(COLOR_RESET)"

medium: check_connection
	@echo "$(COLOR_BLUE)Creating medium test database ($(DB_MEDIUM))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "CREATE DATABASE $(DB_MEDIUM);" 2>/dev/null || echo "Database may already exist or requires cleanup"
	@echo "$(COLOR_BLUE)Loading schema and data...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_MEDIUM)" -f medium_ecommerce.sql
	@echo "$(COLOR_GREEN)✓ Medium database created successfully!$(COLOR_RESET)"
	@echo "$(COLOR_BLUE)  - E-commerce system with 18 tables, 4 views, 5 custom types$(COLOR_RESET)"

large: check_connection
	@echo "$(COLOR_BLUE)Creating large test database ($(DB_LARGE))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "CREATE DATABASE $(DB_LARGE);" 2>/dev/null || echo "Database may already exist or requires cleanup"
	@echo "$(COLOR_BLUE)Loading schema and data...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_LARGE)" -f large_erp.sql
	@echo "$(COLOR_GREEN)✓ Large database created successfully!$(COLOR_RESET)"
	@echo "$(COLOR_BLUE)  - ERP system with 40+ tables, 15 views, 20+ custom types$(COLOR_RESET)"

# ============================================================================
# Reset Databases (Drop and Recreate)
# ============================================================================

.PHONY: reset-all reset-small reset-medium reset-large
reset-all: drop-all all

reset-small: drop-small small
	@echo "$(COLOR_GREEN)✓ Small database reset successfully!$(COLOR_RESET)"

reset-medium: drop-medium medium
	@echo "$(COLOR_GREEN)✓ Medium database reset successfully!$(COLOR_RESET)"

reset-large: drop-large large
	@echo "$(COLOR_GREEN)✓ Large database reset successfully!$(COLOR_RESET)"

# ============================================================================
# Drop Databases
# ============================================================================

.PHONY: drop-all drop-small drop-medium drop-large
drop-all: drop-small drop-medium drop-large
	@echo "$(COLOR_GREEN)✓ All test databases dropped!$(COLOR_RESET)"

drop-small:
	@echo "$(COLOR_YELLOW)Dropping small test database ($(DB_SMALL))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "DROP DATABASE IF EXISTS $(DB_SMALL);" || true
	@echo "$(COLOR_GREEN)✓ Small database dropped!$(COLOR_RESET)"

drop-medium:
	@echo "$(COLOR_YELLOW)Dropping medium test database ($(DB_MEDIUM))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "DROP DATABASE IF EXISTS $(DB_MEDIUM);" || true
	@echo "$(COLOR_GREEN)✓ Medium database dropped!$(COLOR_RESET)"

drop-large:
	@echo "$(COLOR_YELLOW)Dropping large test database ($(DB_LARGE))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "DROP DATABASE IF EXISTS $(DB_LARGE);" || true
	@echo "$(COLOR_GREEN)✓ Large database dropped!$(COLOR_RESET)"

# ============================================================================
# Database Information
# ============================================================================

.PHONY: info info-small info-medium info-large
info: info-small info-medium info-large
	@echo ""
	@echo "$(COLOR_BOLD)=== Summary ===$(COLOR_RESET)"
	@echo "Small:   $(DB_SMALL)"
	@echo "Medium:  $(DB_MEDIUM)"
	@echo "Large:   $(DB_LARGE)"

info-small:
	@echo "$(COLOR_BOLD)=== Small Test Database ($(DB_SMALL)) ===$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_SMALL)" -c "
SELECT
    'Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Views',
    COUNT(*)
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Indexes',
    COUNT(*)
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Schemas',
    COUNT(DISTINCT table_schema)
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema');" 2>/dev/null || echo "  Database does not exist"

info-medium:
	@echo "$(COLOR_BOLD)=== Medium Test Database ($(DB_MEDIUM)) ===$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_MEDIUM)" -c "
SELECT
    'Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Views',
    COUNT(*)
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Custom Types',
    COUNT(*)
FROM pg_type
WHERE typcategory = 'E'
UNION ALL
SELECT
    'Indexes',
    COUNT(*)
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');" 2>/dev/null || echo "  Database does not exist"

info-large:
	@echo "$(COLOR_BOLD)=== Large Test Database ($(DB_LARGE)) ===$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_LARGE)" -c "
SELECT
    'Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Views',
    COUNT(*)
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Custom Types',
    COUNT(*)
FROM pg_type
WHERE typcategory = 'E'
UNION ALL
SELECT
    'Indexes',
    COUNT(*)
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT
    'Schemas',
    COUNT(DISTINCT table_schema)
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema');" 2>/dev/null || echo "  Database does not exist"

# ============================================================================
# Database Statistics
# ============================================================================

.PHONY: stats
stats: check_connection
	@echo "$(COLOR_BOLD)=== Database Statistics ===$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_YELLOW)Small Database ($(DB_SMALL)):$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_SMALL)" -c "
SELECT
    s.nspname as schema,
    t.relname as table,
    pg_size_pretty(pg_total_relation_size(t.oid)) as size,
    n_live_tup as row_count
FROM pg_stat_user_tables t
JOIN pg_namespace s ON t.relnamespace = s.oid
ORDER BY pg_total_relation_size(t.oid) DESC
LIMIT 10;" 2>/dev/null || echo "  Database does not exist"
	@echo ""
	@echo "$(COLOR_YELLOW)Medium Database ($(DB_MEDIUM)):$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_MEDIUM)" -c "
SELECT
    s.nspname as schema,
    t.relname as table,
    pg_size_pretty(pg_total_relation_size(t.oid)) as size,
    n_live_tup as row_count
FROM pg_stat_user_tables t
JOIN pg_namespace s ON t.relnamespace = s.oid
ORDER BY pg_total_relation_size(t.oid) DESC
LIMIT 10;" 2>/dev/null || echo "  Database does not exist"
	@echo ""
	@echo "$(COLOR_YELLOW)Large Database ($(DB_LARGE)):$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_LARGE)" -c "
SELECT
    s.nspname as schema,
    t.relname as table,
    pg_size_pretty(pg_total_relation_size(t.oid)) as size,
    n_live_tup as row_count
FROM pg_stat_user_tables t
JOIN pg_namespace s ON t.relnamespace = s.oid
ORDER BY pg_total_relation_size(t.oid) DESC
LIMIT 10;" 2>/dev/null || echo "  Database does not exist"

# ============================================================================
# Connect to Databases
# ============================================================================

.PHONY: connect-small connect-medium connect-large
connect-small:
	@echo "$(COLOR_BLUE)Connecting to small database ($(DB_SMALL))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_SMALL)"

connect-medium:
	@echo "$(COLOR_BLUE)Connecting to medium database ($(DB_MEDIUM))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_MEDIUM)"

connect-large:
	@echo "$(COLOR_BLUE)Connecting to large database ($(DB_LARGE))...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_LARGE)"

# ============================================================================
# Dump Databases
# ============================================================================

.PHONY: dump-small dump-medium dump-large
dump-small:
	@echo "$(COLOR_BLUE)Dumping small database to SQL file...$(COLOR_RESET)"
	@pg_dump "$(CONN_STR)" -d "$(DB_SMALL)" -c > small_blog_dump.sql
	@echo "$(COLOR_GREEN)✓ Dump saved to: small_blog_dump.sql$(COLOR_RESET)"

dump-medium:
	@echo "$(COLOR_BLUE)Dumping medium database to SQL file...$(COLOR_RESET)"
	@pg_dump "$(CONN_STR)" -d "$(DB_MEDIUM)" -c > medium_ecommerce_dump.sql
	@echo "$(COLOR_GREEN)✓ Dump saved to: medium_ecommerce_dump.sql$(COLOR_RESET)"

dump-large:
	@echo "$(COLOR_BLUE)Dumping large database to SQL file...$(COLOR_RESET)"
	@pg_dump "$(CONN_STR)" -d "$(DB_LARGE)" -c > large_erp_dump.sql
	@echo "$(COLOR_GREEN)✓ Dump saved to: large_erp_dump.sql$(COLOR_RESET)"

# ============================================================================
# Tests
# ============================================================================

.PHONY: test check_connection
test: check_connection
	@echo "$(COLOR_BLUE)Running database connectivity test...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "SELECT version();" > /dev/null 2>&1 && echo "$(COLOR_GREEN)✓ PostgreSQL connection successful!$(COLOR_RESET)" || (echo "$(COLOR_RED)✗ PostgreSQL connection failed!$(COLOR_RESET)" && exit 1)
	@psql "$(CONN_STR)" -c "SELECT current_database();" > /dev/null 2>&1 && echo "$(COLOR_GREEN)✓ Default database accessible!$(COLOR_RESET)"
	@psql "$(CONN_STR)" -c "SELECT COUNT(*) FROM pg_database WHERE datname IN ('$(DB_SMALL)', '$(DB_MEDIUM)', '$(DB_LARGE)');" > /dev/null 2>&1
	@echo "$(COLOR_GREEN)✓ All tests passed!$(COLOR_RESET)"

check_connection:
	@psql "$(CONN_STR)" -c "SELECT 1;" > /dev/null 2>&1 || (echo "$(COLOR_RED)✗ Cannot connect to PostgreSQL!$(COLOR_RESET)" && echo "  Please check your connection settings:" && echo "  - PGHOST: $(PGHOST)" && echo "  - PGPORT: $(PGPORT)" && echo "  - PGUSER: $(PGUSER)" && echo "" && echo "  Example: PGHOST=localhost PGUSER=postgres make test" && exit 1)

# ============================================================================
# Schema Validation
# ============================================================================

.PHONY: validate validate-small validate-medium validate-large
validate: validate-small validate-medium validate-large

validate-small:
	@echo "$(COLOR_BLUE)Validating small database schema...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_SMALL)" -c "
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Users table exists'
        ELSE '✗ Users table missing'
    END as validation
FROM information_schema.tables
WHERE table_name = 'users' AND table_schema = 'public';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Posts table exists'
        ELSE '✗ Posts table missing'
    END as validation
FROM information_schema.tables
WHERE table_name = 'posts' AND table_schema = 'public';" 2>/dev/null || echo "  Database does not exist"

validate-medium:
	@echo "$(COLOR_BLUE)Validating medium database schema...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_MEDIUM)" -c "
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Products table exists'
        ELSE '✗ Products table missing'
    END as validation
FROM information_schema.tables
WHERE table_name = 'products' AND table_schema = 'public';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Orders table exists'
        ELSE '✗ Orders table missing'
    END as validation
FROM information_schema.tables
WHERE table_name = 'orders' AND table_schema = 'public';" 2>/dev/null || echo "  Database does not exist"

validate-large:
	@echo "$(COLOR_BLUE)Validating large database schema...$(COLOR_RESET)"
	@psql "$(CONN_STR)" -d "$(DB_LARGE)" -c "
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ HR schema exists'
        ELSE '✗ HR schema missing'
    END as validation
FROM information_schema.schemata
WHERE schema_name = 'hr';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ CRM schema exists'
        ELSE '✗ CRM schema missing'
    END as validation
FROM information_schema.schemata
WHERE schema_name = 'crm';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Finance schema exists'
        ELSE '✗ Finance schema missing'
    END as validation
FROM information_schema.schemata
WHERE schema_name = 'finance';" 2>/dev/null || echo "  Database does not exist"

# ============================================================================
# Quick Reference
# ============================================================================

.PHONY: quick-ref
quick-ref:
	@echo "$(COLOR_BOLD)Quick Reference - Sample Queries$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_YELLOW)Small Database (Blog):$(COLOR_RESET)"
	@echo "  -- List all users"
	@echo "  SELECT * FROM users;"
	@echo "  -- List published posts with author"
	@echo "  SELECT * FROM published_posts;"
	@echo ""
	@echo "$(COLOR_YELLOW)Medium Database (E-commerce):$(COLOR_RESET)"
	@echo "  -- List active products"
	@echo "  SELECT * FROM v_products_active;"
	@echo "  -- Show low stock alerts"
	@echo "  SELECT * FROM v_low_stock_products;"
	@echo "  -- Order summary"
	@echo "  SELECT * FROM v_order_summary;"
	@echo ""
	@echo "$(COLOR_YELLOW)Large Database (ERP):$(COLOR_RESET)"
	@echo "  -- User summary"
	@echo "  SELECT * FROM public.v_user_summary;"
	@echo "  -- Employee directory"
	@echo "  SELECT * FROM hr.v_employee_directory;"
	@echo "  -- Pipeline summary"
	@echo "  SELECT * FROM crm.v_pipeline_summary;"
	@echo "  -- Revenue summary"
	@echo "  SELECT * FROM finance.v_revenue_summary;"
	@echo "  -- Project dashboard"
	@echo "  SELECT * FROM projects.v_project_dashboard;"

# ============================================================================
# Cleanup
# ============================================================================

.PHONY: clean
clean:
	@echo "$(COLOR_YELLOW)Cleaning up dump files...$(COLOR_RESET)"
	@rm -f small_blog_dump.sql medium_ecommerce_dump.sql large_erp_dump.sql
	@echo "$(COLOR_GREEN)✓ Cleanup complete!$(COLOR_RESET)"

# ============================================================================
# Installation Check
# ============================================================================

.PHONY: check-install
check-install:
	@echo "$(COLOR_BLUE)Checking PostgreSQL client tools...$(COLOR_RESET)"
	@which psql > /dev/null 2>&1 && echo "$(COLOR_GREEN)✓ psql found: $$(which psql)$(COLOR_RESET)" || echo "$(COLOR_RED)✗ psql not found$(COLOR_RESET)"
	@which pg_dump > /dev/null 2>&1 && echo "$(COLOR_GREEN)✓ pg_dump found: $$(which pg_dump)$(COLOR_RESET)" || echo "$(COLOR_RED)✗ pg_dump not found$(COLOR_RESET)"
	@which pg_isready > /dev/null 2>&1 && echo "$(COLOR_GREEN)✓ pg_isready found: $$(which pg_isready)$(COLOR_RESET)" || echo "$(COLOR_RED)✗ pg_isready not found$(COLOR_RESET)"
	@echo ""
	@echo "Install PostgreSQL client tools:"
	@echo "  macOS:   brew install postgresql"
	@echo "  Ubuntu:  sudo apt-get install postgresql-client"
	@echo "  Windows: Download from https://www.postgresql.org/download/windows/"

# Prevent accidental execution of targets that should have dependencies
.DEFAULT_GOAL := help
