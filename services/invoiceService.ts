
import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { Car, UserProfile, Booking } from '../types';

export const generateInvoicePDF = async (
  booking: any,
  user: UserProfile,
  car: Car,
  paymentId: string
) => {
  const doc = new jsPDF();
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('Auto Concept Group', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Premium Automotive Experiences', 105, 27, { align: 'center' });
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  // Invoice Details
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text('CAR BOOKING INVOICE', 20, 50);
  
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoiceNumber}`, 20, 60);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
  doc.text(`Razorpay ID: ${paymentId}`, 20, 70);
  doc.text(`Booking ID: ${booking.id}`, 20, 75);
  
  // Sections
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('CUSTOMER DETAILS', 20, 90);
  doc.setTextColor(30);
  doc.setFontSize(10);
  doc.text(`Name: ${user.name}`, 20, 97);
  doc.text(`Email: ${user.email}`, 20, 102);
  doc.text(`Phone: ${user.phone || 'N/A'}`, 20, 107);
  
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('VEHICLE DETAILS', 110, 90);
  doc.setTextColor(30);
  doc.setFontSize(10);
  doc.text(`Car: ${car.brand} ${car.name}`, 110, 97);
  doc.text(`Variant: ${car.variant}`, 110, 102);
  doc.text(`Year: ${car.year || 'N/A'}`, 110, 107);
  doc.text(`Fuel: ${car.fuel}`, 110, 112);
  
  // Payment Table
  doc.setFillColor(245, 247, 250);
  doc.rect(20, 130, 170, 10, 'F');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text('Description', 25, 137);
  doc.text('Amount (INR)', 160, 137);
  
  doc.setTextColor(30);
  doc.text(`Booking Token for ${car.name}`, 25, 150);
  doc.text(`Rs. ${booking.token_paid.toLocaleString()}`, 160, 150);
  
  doc.line(20, 155, 190, 155);
  
  doc.setFontSize(12);
  doc.text('Total Paid', 25, 165);
  doc.text(`Rs. ${booking.token_paid.toLocaleString()}`, 160, 165);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('Thank you for choosing Auto Concept Group.', 105, 250, { align: 'center' });
  doc.text('This is a system-generated invoice.', 105, 255, { align: 'center' });
  
  // Save/Upload
  const pdfBlob = doc.output('blob');
  const fileName = `${invoiceNumber}.pdf`;
  
  try {
    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBlob, { contentType: 'application/pdf' });
      
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName);
    const invoiceUrl = urlData.publicUrl;
    
    // 2. Save to Invoices Table
    const { error: dbError } = await supabase.from('invoices').insert([{
      invoice_number: invoiceNumber,
      booking_id: booking.id,
      payment_id: paymentId,
      invoice_url: invoiceUrl,
      created_at: new Date().toISOString()
    }]);
    
    if (dbError) throw dbError;
    
    return { invoiceUrl, invoiceNumber, blob: pdfBlob };
  } catch (error) {
    console.error("Invoice logic failed:", error);
    // Even if storage fails, we allow user to download the generated blob
    return { blob: pdfBlob, invoiceNumber };
  }
};
