#!/bin/bash

# DKUT Medical Backend - Automated Installation Script
# This script installs all dependencies and sets up the development environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_header "DKUT Medical Backend - Automated Installation"

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed!"
    echo "Please install Node.js >= 18.0.0 from https://nodejs.org"
    exit 1
fi

if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm installed: v$PNPM_VERSION"
else
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    print_success "pnpm installed successfully"
fi

if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed!"
    echo "Please install Python >= 3.9"
    exit 1
fi

if command_exists psql; then
    print_success "PostgreSQL client found"
else
    print_warning "PostgreSQL client not found. Please ensure PostgreSQL is installed."
fi

# Step 2: Install Node.js dependencies
print_header "Step 2: Installing Node.js Dependencies"
print_info "This may take a few minutes..."

pnpm install
print_success "Node.js dependencies installed"

# Step 3: Install Python dependencies
print_header "Step 3: Installing Python Dependencies"

cd ml_service

if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

print_info "Activating virtual environment and installing dependencies..."

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    print_success "Python dependencies installed"
else
    print_warning "Virtual environment activation failed. Installing globally..."
    pip3 install -r requirements.txt
    print_success "Python dependencies installed globally"
fi

cd ..

# Step 4: Setup environment file
print_header "Step 4: Setting Up Environment"

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file from template"
    print_warning "Please update .env with your configuration before running the app"
else
    print_info ".env file already exists, skipping..."
fi

# Step 5: Generate Prisma Client
print_header "Step 5: Generating Prisma Client"

pnpm prisma:generate
print_success "Prisma client generated"

# Step 6: Database setup prompt
print_header "Step 6: Database Setup"

read -p "Do you want to set up the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setting up database..."
    
    # Check if DATABASE_URL is set
    if grep -q "DATABASE_URL" .env; then
        pnpm prisma migrate dev --name init
        print_success "Database migrations completed"
        
        read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pnpm prisma:seed
            print_success "Database seeded with test data"
        fi
    else
        print_error "DATABASE_URL not found in .env"
        print_info "Please configure your database connection in .env and run:"
        echo "  pnpm prisma:migrate"
        echo "  pnpm prisma:seed"
    fi
else
    print_info "Skipping database setup. You can run it later with:"
    echo "  pnpm prisma:migrate"
    echo "  pnpm prisma:seed"
fi

# Step 7: Create logs directory
print_header "Step 7: Creating Directories"

mkdir -p logs uploads
print_success "Created logs and uploads directories"

# Installation complete
print_header "Installation Complete! 🎉"

echo -e "\n${GREEN}Next Steps:${NC}\n"
echo "1. Update .env file with your configuration"
echo "2. Start the development servers:"
echo "   Terminal 1: ${BLUE}pnpm dev${NC}              (Express Backend)"
echo "   Terminal 2: ${BLUE}cd ml_service && python app.py${NC}  (ML Service)"
echo ""
echo "3. Optional: Open Prisma Studio"
echo "   Terminal 3: ${BLUE}pnpm prisma:studio${NC}"
echo ""
echo -e "${GREEN}Default Test Credentials (after seeding):${NC}"
echo "  Admin:   admin@dkut.ac.ke / admin123"
echo "  Doctor:  dr.mwangi@dkut.ac.ke / staff123"
echo "  Patient: student@dkut.ac.ke / patient123"
echo ""
echo -e "${BLUE}API will be available at:${NC} http://localhost:3000"
echo -e "${BLUE}ML Service will be at:${NC}   http://localhost:5000"
echo ""
echo -e "For more information, check:"
echo "  - ${BLUE}README.md${NC} for full documentation"
echo "  - ${BLUE}QUICK_START.md${NC} for quick start guide"
echo "  - ${BLUE}DEPLOYMENT_GUIDE.md${NC} for production deployment"
echo ""
print_success "Installation script completed successfully!"