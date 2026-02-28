const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isRoomOfferActive = (room, now = new Date()) => {
  if (!room || room.isOffer !== true) return false;

  const offerDiscount = toNumber(room.offerPriceLess);
  if (offerDiscount <= 0) return false;

  if (!room.offerExp) return true;
  const expiryDate = toDate(room.offerExp);
  if (!expiryDate) return false;

  return expiryDate.getTime() >= now.getTime();
};

export const getRoomFinalPrice = (room) => {
  const finalPrice = toNumber(room?.finalPrice);
  if (finalPrice > 0) return finalPrice;

  const price = toNumber(room?.price);
  if (price > 0) return price;

  return 0;
};

export const getRoomOriginalPrice = (room) => {
  const originalPrice = toNumber(room?.originalPrice);
  if (originalPrice > 0) return originalPrice;

  const finalPrice = getRoomFinalPrice(room);
  const offerDiscount = toNumber(room?.offerPriceLess);
  if (finalPrice > 0 && offerDiscount > 0) return finalPrice + offerDiscount;

  return finalPrice;
};

export const getHotelStartingPrice = (hotel) => {
  const rooms = Array.isArray(hotel?.rooms) ? hotel.rooms : [];
  const roomPrices = rooms
    .map((room) => getRoomFinalPrice(room))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (!roomPrices.length) return 0;
  return Math.min(...roomPrices);
};

export const getHotelOfferSummary = (hotel, now = new Date()) => {
  const rooms = Array.isArray(hotel?.rooms) ? hotel.rooms : [];
  const activeOfferRooms = rooms.filter((room) => isRoomOfferActive(room, now));

  if (!activeOfferRooms.length) {
    return {
      hasOffer: false,
      offerName: "",
      finalPrice: 0,
      originalPrice: 0,
      discountAmount: 0,
      offerExp: null,
    };
  }

  const roomWithBestDeal = [...activeOfferRooms].sort((first, second) => {
    const firstFinal = getRoomFinalPrice(first);
    const secondFinal = getRoomFinalPrice(second);
    return firstFinal - secondFinal;
  })[0];

  const finalPrice = getRoomFinalPrice(roomWithBestDeal);
  const originalPrice = getRoomOriginalPrice(roomWithBestDeal);
  const discountAmount = Math.max(
    0,
    toNumber(roomWithBestDeal?.offerPriceLess),
    originalPrice - finalPrice,
  );

  return {
    hasOffer: true,
    offerName: String(roomWithBestDeal?.offerName || "").trim(),
    finalPrice,
    originalPrice,
    discountAmount,
    offerExp: roomWithBestDeal?.offerExp || null,
  };
};
