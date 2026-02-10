# Booking Flow (Hotel) - Hindi Notes

Ye document `BookNow` booking flow, date logic, GST logic, monthly pricing logic, aur related APIs ko explain karta hai.

**Relevant Files**
- `src/pages/booking/Booknow.jsx`
- `src/pages/booking/hooks/useBookingOperations.js`
- `src/pages/booking/utils/bookingHelpers.js`
- `src/redux/slices/bookingSlice.js`
- `src/services/bookingService.js`
- `src/utils/Unauthorized.jsx`

**1) Booking ka overall flow**
- Page entry pe hotel data `state?.hotel` ya store se aata hai. `hotelId` normalize/derive hota hai. `fetchBookingData(hotelId)` aur `fetchMonthlyData(hotelId)` dispatch hote hain. (`Booknow.jsx`)
- Dates/rooms/guests ka initial state navigation `tripMeta` se aata hai; agar missing ho to default aaj +1 din set hota hai. (`ensureIsoDate`)
- Rooms/guests constraints:
  - Minimum rooms = `requiredRoomsForGuests(guests)` (1 room me max 3 guests). (`bookingHelpers.js`)
  - Guests max = `roomsCount * 3`.
  - `RoomsGuestsPopup` me room-wise guests 1–3 limit.
- Selected room: agar selected room available nahi hai to first available auto-select.
- Price calculation: `baseSubtotal = roomPrice * roomsCount * nights`, food add-on alag; discount minus; GST add; final payable `netPay`.
- Booking submit: `useBookingOperations` ke `handleOfflineBooking` se payload banta hai aur API call hota hai. Success pe `BookingSuccessModal` open hota hai.

**2) Date Logic (check-in / check-out)**
- `ensureIsoDate(value, offsetFallback)`
  - Agar date valid ho to ISO string return karta hai.
  - Invalid/missing date pe `today + offsetFallback` set hota hai (check-in 0, check-out 1). (`bookingHelpers.js`)
- Nights calculation:
  - `calculateStayNights(checkIn, checkOut)` (Booknow) aur `calculateNights` (useBookingOperations) dono difference days ka `ceil` lete hain.
  - Minimum 1 night enforce hota hai.
- API payload dates:
  - `formatForApi(date)` → `YYYY-MM-DD` format me convert karta hai. (`useBookingOperations.js`)

**3) GST Logic**
GST calculation do path me hota hai:

A) **Room/Food level GST percent available ho to local compute**
- Agar `selectedRooms` me `gstPercent/gstPercentage` hai ya `selectedFood` me GST percent hai:
  - `roomTaxPerNight` per-room GST: 
    - Prefer `room.gstAmount` if present
    - Else `price * percent / 100`
  - Total room GST = `roomTaxPerNight * roomsCount * nights`
  - Food GST = `price * qty * percent / 100` (food per-stay treat hota hai, nights se multiply nahi hota)
  - Final GST = rounded sum

B) **GST percent nahi hai to API se GST quote**
- `taxableAmount = (room nightly total * roomsCount * nights) + foodTotal - discount`
- `getGstForHotelData(...)` dispatch hota hai aur response se `gstAmount` set hota hai. (`useBookingOperations.js` + `bookingSlice.js`)
- `lastGstQueryRef` repeated calls avoid karta hai jab taxable amount same ho.

**4) Monthly Pricing Logic**
- Monthly data API se aata hai: `fetchMonthlyData(hotelId)` → `/monthly-set-room-price/get/by/{hotelId}`.
- `pickMonthlyOverride(monthlyData, roomId, checkInIso, checkOutIso)`:
  - Room ID match karta hai
  - Date range overlap check karta hai (`dateRangesOverlap`)
- Agar match milta hai to `effectivePrice = monthlyOverride.monthPrice` use hota hai.
- `selectedRoomsPayload` me `monthlyPriceApplied` aur `monthlyPriceMeta` store hota hai, taaki booking payload me pricing context rahe.

**5) Coupon Logic**
- `applyCouponCode` thunk API:
  - Endpoint: `/user-coupon/apply/a/coupon-to-room/user`
  - Payload: `hotelId, userId, roomId, couponCode, checkInDate, checkOutDate, numRooms, guests`
  - Response se `discountPrice` update hota hai, phir GST re-calc hota hai.
- `userId` localStorage se aata hai: `src/utils/Unauthorized.jsx`.

**6) Booking Status Logic**
- `computeBookingStatus({ roomsCount, nights })`:
  - `roomsCount > 3` → `Pending`
  - `roomsCount == 1` & `nights > 3` → `Pending`
  - otherwise `Confirmed`

**7) APIs in Use (Booking flow)**
- `GET /hotels/get-by-id/{hotelId}`
  - Source: `fetchBookingData` in `bookingSlice.js`
- `GET /monthly-set-room-price/get/by/{hotelId}`
  - Source: `fetchMonthlyData` in `bookingSlice.js`
- `PATCH /user-coupon/apply/a/coupon-to-room/user`
  - Source: `applyCouponCode` in `bookingSlice.js`
- `GET /gst/get-single-gst?type=Hotel&gstThreshold=...`
  - Source: `getGstForHotelData` in `bookingSlice.js`
- `POST /booking/{userId}/{hotelId}`
  - Source: `createBookingRequest` in `bookingService.js`
- `POST /create-order`
  - Source: `createPaymentOrder` in `bookingService.js` (online payment flow)
- External script:
  - `https://checkout.razorpay.com/v1/checkout.js` (Razorpay SDK)

**8) Important Notes (Current Code Behavior)**
- `useBookingOperations.recalculateGst()` API call me `{ hotelId, amount }` pass hota hai, lekin `getGstForHotelData` thunk currently `{ type, gstThreshold }` expect karta hai. Isliye GST API request me `hotelId/amount` use nahi hota. Agar backend ko amount chahiye, thunk signature update karna padega.
- Food price UI me per-stay treat hota hai (nights se multiply nahi hota), aur GST bhi per-stay hi hai.
- Guests per room limit 3 hai (RoomsGuestsPopup + requiredRoomsForGuests).

---
Agar aap chaho to main is file ko aur expand karke exact payload examples aur UI flow diagram bhi add kar sakta hoon.
