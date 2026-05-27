const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const { requireAuth, requireStaff, requireAdmin } = require('./middleware/auth');

app.use(express.json());

// Import route files
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const licenseRenewalRoutes = require('./routes/licenseRenewal');
const licensePaymentRoutes = require('./routes/licensePayment');
const lostDocumentsRoute = require('./routes/lostDocuments');
const testResultsRoute = require('./routes/testResults'); // ✅ New line
const appointmentRoutes = require('./routes/appointments');
const ownershipTransferRoutes = require('./routes/ownershipTransfer');
const trafficViolationsRoute = require('./routes/trafficViolations');
const vehicleConversionRoutes = require('./routes/vehicleConversion');
const vehicleDeregistrationRoutes =  require('./routes/vehicleDeregistration');
const vehicleModificationRoutes = require('./routes/vehicleModification');
const vehicleRegistrationRoutes = require('./routes/vehicleRegistration');
const vehicleLicenseRenewalRoutes = require('./routes/vehicleLicenseRenewal');
const vehicleMortgageReleaseRoutes = require('./routes/vehicleMortgageRelease');
const vehiclesRoutes = require('./routes/vehicles');
const citizenRoutes = require('./routes/citizen');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const monthlyReportRoute = require('./routes/staff/monthlyReport');
const confirmUserRoutes = require('./routes/staff/confirmUser');

const staffMessagesRoute = require('./routes/staff/messages');
app.use('/api/staff/messages', requireStaff, staffMessagesRoute);
const completedTransactionsRoute = require('./routes/staff/completedTransactions');
app.use('/api/staff', requireStaff, completedTransactionsRoute);
const inProgressTransactionsRoute = require('./routes/staff/inProgressTransactions');
app.use('/api/staff', requireStaff, inProgressTransactionsRoute);
const receivedTransactionsRoute = require('./routes/staff/receivedTransactions');
app.use('/api/staff', requireStaff, receivedTransactionsRoute);
const staffTransactionsRoute = require('./routes/staff/transactions');
app.use('/api/staff/transactions', requireStaff, staffTransactionsRoute);

const smartSearchRoutes = require('./routes/staff/smartSearch');
app.use('/api/staff', requireStaff, smartSearchRoutes);



// Register routes
app.use('/', loginRoutes);
app.use('/', registerRoutes);
app.use('/license', licenseRenewalRoutes);
app.use('/api', licensePaymentRoutes);
app.use('/api', lostDocumentsRoute);
app.use('/api', testResultsRoute); // ✅ New route added
app.use('/api', appointmentRoutes);
app.use('/api', ownershipTransferRoutes);
app.use('/api', trafficViolationsRoute);
app.use('/api', vehicleConversionRoutes);
app.use('/api', vehicleDeregistrationRoutes);
app.use('/api', vehicleModificationRoutes);
app.use('/api', vehicleRegistrationRoutes);
app.use('/api', vehicleLicenseRenewalRoutes);
app.use('/api', vehicleMortgageReleaseRoutes);
app.use('/api', vehiclesRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api/staff', requireStaff, monthlyReportRoute);
app.use('/api/staff', requireStaff, confirmUserRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
