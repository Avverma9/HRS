import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchFilteredBooking } from "../../redux/slices/bookingSlice";
import baseURL from "../../utils/baseURL";
import { useLoader } from "../../utils/loader";
import NotFoundPage from "../../utils/Not-found";
import { Unauthorized } from "../../utils/Unauthorized";
import { useToast } from "../../utils/toast";
import { IoCloseSharp, IoPrintOutline, IoReceiptOutline } from "react-icons/io5";
import { FiFilter, FiMapPin } from "react-icons/fi";
import { useMediaQuery } from "@mui/material";

// --- 1. UTILITIES ---

// Print Function (Opens a new window with Tailwind CDN for styling)
const printSpecificContent = (htmlContent) => {
  if (!htmlContent) return;
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Ticket</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; background: #fff; padding: 20px; display: flex; justify-content: center; }
            .print-container { max-width: 400px; width: 100%; border: 2px solid #0f172a; padding: 20px; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

// Modal Shell
const ModalShell = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {children}
      </div>
    </div>
  );
};

// --- 2. MAIN COMPONENT ---

export default function MyBookings() {
  const dispatch = useDispatch();
  const { showLoader, hideLoader } = useLoader();
  const toast = useToast();
  
  // State
  const [htmlContent, setHtmlContent] = useState("");
  const [bookings, setBookings] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState({ currentPage: 1, totalPages: 1 });
  
  // Modal State
  const [modalData, setModalData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("Confirmed");
  
  // Redux & Globals
  const filteredBookings = useSelector((state) => state.booking.filteredBookings);
  const userIdLocal = localStorage.getItem("rsUserId");
  const isSmallScreen = useMediaQuery('(max-width:768px)');
  const bookingsPerPage = isSmallScreen ? 5 : 10;

  // --- 3. WINDOW HANDLERS (Bridge Backend to Frontend) ---
  useEffect(() => {
    window.handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.handleShowDetails = (id) => {
      const booking = bookings.find(b => b.bookingId === id || b._id === id);
      if (booking) {
        setModalData(booking);
        setShowModal(true);
      }
    };

    window.handlePrintTicket = (contentHtml) => {
      printSpecificContent(contentHtml);
    };

    return () => {
      delete window.handlePageChange;
      delete window.handleShowDetails;
      delete window.handlePrintTicket;
    };
  }, [bookings]);

  // --- 4. DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      if (!userIdLocal) return;
      try {
        showLoader();
        await dispatch(fetchFilteredBooking({ 
          selectedStatus, 
          userId: userIdLocal, 
          page: currentPage, 
          limit: bookingsPerPage 
        }));
      } catch (error) {
        toast.error("Failed to load bookings");
      } finally {
        hideLoader();
      }
    };
    fetchData();
  }, [dispatch, selectedStatus, currentPage, userIdLocal]);

  // Sync Redux Data
  useEffect(() => {
    if (filteredBookings) {
      setHtmlContent(filteredBookings.html || "");
      setBookings(Array.isArray(filteredBookings.data) ? filteredBookings.data : []);
      if (filteredBookings.pagination) setPaginationInfo(filteredBookings.pagination);
    }
  }, [filteredBookings]);

  // --- 5. SMART PRINT HANDLER ---
  const handlePrintFromModal = () => {
    // Try to find the pre-generated HTML from the hidden DOM list first (Best Quality)
    if (modalData) {
      const hiddenElement = document.getElementById(`print-view-${modalData.bookingId}`);
      if (hiddenElement) {
        printSpecificContent(hiddenElement.innerHTML);
      } else {
        // Fallback: Print the current window
        window.print();
      }
    }
  };

  // --- 6. RENDER HELPERS (Calculations) ---
  const calculateCosts = (data) => {
    if(!data) return { roomTotal: 0, foodTotal: 0, tax: 0, grandTotal: 0 };
    
    // Safety checks for numbers
    const finalPrice = Number(data.price) || 0;
    const foodTotal = (data.foodDetails || []).reduce((acc, f) => acc + ((Number(f.price)||0) * (Number(f.quantity)||1)), 0);
    
    // Reverse calculation assuming finalPrice includes 12% GST
    const baseAmount = Math.round(finalPrice / 1.12); 
    const tax = finalPrice - baseAmount;
    const roomTotal = baseAmount - foodTotal;

    return { roomTotal, foodTotal, tax, grandTotal: finalPrice };
  };

  if (!userIdLocal) return <Unauthorized />;

  const costs = calculateCosts(modalData);

  return (
    <main className="p-2 md:p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header & Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IoReceiptOutline className="text-slate-600" /> My Bookings
          </h1>
          <div className="relative w-full sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none appearance-none"
            >
              {['Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* --- BOOKING LIST (Backend HTML) --- */}
        <div className="min-h-[400px]">
          {htmlContent ? (
            <div className="animate-fadeIn" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <div className="text-center py-10"><NotFoundPage /></div>
          )}
        </div>
      </div>

      {/* --- TICKET MODAL (Receipt Style) --- */}
      <ModalShell open={showModal} onClose={() => setShowModal(false)}>
        {modalData && (
          <div className="flex flex-col h-full bg-white">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Booking Details</h2>
              <button onClick={() => setShowModal(false)} className="bg-white p-1.5 rounded-full shadow-sm border hover:bg-red-50 hover:text-red-500 transition-all">
                <IoCloseSharp size={18} />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-white">
              <div className="border-2 border-slate-800 p-5 rounded-sm relative">
                
                {/* 1. Ticket Header */}
                <div className="flex justify-between items-start mb-6 border-b border-dashed border-slate-300 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{modalData.hotelDetails?.hotelName}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                       <FiMapPin className="inline w-3 h-3" /> {modalData.destination}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${modalData.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {modalData.bookingStatus}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">ID: #{modalData.bookingId.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* 2. Dates Timeline */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100 mb-5">
                   <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Check-in</p>
                      <p className="text-sm font-bold text-slate-900">{modalData.checkInDate}</p>
                   </div>
                   <div className="flex-1 px-4 flex flex-col items-center">
                      <div className="w-full h-px bg-slate-300"></div>
                      <span className="text-[9px] bg-white px-2 -mt-2 text-slate-400 font-medium">1 Night</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Check-out</p>
                      <p className="text-sm font-bold text-slate-900">{modalData.checkOutDate}</p>
                   </div>
                </div>

                {/* 3. Room & Guests */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-5">
                   <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Guest Name</p>
                      <p className="font-semibold text-slate-800">{modalData.user?.name || "Guest"}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Room Type</p>
                      <p className="font-semibold text-slate-800">
                        {modalData.roomDetails?.[0]?.type || "Standard"}
                        <span className="text-slate-400 font-normal"> ({modalData.guests} Guests)</span>
                      </p>
                   </div>
                </div>

                {/* 4. Food Orders (Conditional) */}
                {modalData.foodDetails?.length > 0 && (
                   <div className="mb-5 pt-3 border-t border-dashed border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-orange-500 mb-2">Food Orders</p>
                      {modalData.foodDetails.map((f, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600 mb-1">
                           <span>{f.name} <span className="text-slate-400">x{f.quantity}</span></span>
                           <span className="font-medium">₹{f.price * f.quantity}</span>
                        </div>
                      ))}
                   </div>
                )}

                {/* 5. Payment Breakdown */}
                <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
                   <div className="flex justify-between text-xs text-slate-500">
                      <span>Room Base Price</span>
                      <span>₹{costs.roomTotal}</span>
                   </div>
                   {costs.foodTotal > 0 && (
                     <div className="flex justify-between text-xs text-slate-500">
                        <span>Food & Beverages</span>
                        <span>₹{costs.foodTotal}</span>
                     </div>
                   )}
                   <div className="flex justify-between text-xs text-slate-500">
                      <span>GST & Taxes (12%)</span>
                      <span>₹{costs.tax}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-1">
                      <span className="text-sm font-bold text-slate-900">Total Paid</span>
                      <span className="text-lg font-black text-slate-900">₹{costs.grandTotal}</span>
                   </div>
                </div>

              </div>
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <button 
                onClick={handlePrintFromModal}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                <IoPrintOutline size={18} /> Print Ticket
              </button>
            </div>

          </div>
        )}
      </ModalShell>

    </main>
  );
}