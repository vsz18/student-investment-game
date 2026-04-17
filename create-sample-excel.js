const XLSX = require('xlsx');

// Sample company data
const companies = [
    { 'Company Name': 'TechStart AI', 'Description': 'AI-powered platform for small business automation' },
    { 'Company Name': 'GreenEnergy Solutions', 'Description': 'Renewable energy consulting and installation services' },
    { 'Company Name': 'HealthTrack Pro', 'Description': 'Wearable health monitoring device with AI diagnostics' },
    { 'Company Name': 'EduLearn Online', 'Description': 'Interactive online learning platform for K-12 students' },
    { 'Company Name': 'FoodDelivery Express', 'Description': 'Ultra-fast food delivery service using drones' },
    { 'Company Name': 'FinTech Wallet', 'Description': 'Digital wallet with cryptocurrency integration' },
    { 'Company Name': 'SmartHome Hub', 'Description': 'Centralized home automation control system' },
    { 'Company Name': 'CloudStorage Plus', 'Description': 'Secure cloud storage with AI-powered organization' }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(companies);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Companies');

// Write to file
XLSX.writeFile(wb, 'sample-companies.xlsx');

console.log('✓ Created sample-companies.xlsx with', companies.length, 'companies');

// Made with Bob
