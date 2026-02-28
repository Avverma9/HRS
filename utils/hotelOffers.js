const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return false;
};

const getRoomTaxPercent = (room) => {
  const pricing = room?.pricing || {};
  return toNumber(
    pricing?.taxPercent ||
      pricing?.gstPercent ||
      room?.taxPercent ||
      room?.gstPercent,
  );
};

const getRoomTaxAmount = (room) => {
  const pricing = room?.pricing || {};
  return toNumber(pricing?.taxAmount || room?.taxAmount || room?.gstAmount);
};

const derivePreTaxPrice = (finalPrice, taxPercent, taxAmount) => {
  if (finalPrice <= 0) return 0;

  if (taxPercent > 0) {
    return finalPrice / (1 + taxPercent / 100);
  }

  if (taxAmount > 0 && finalPrice > taxAmount) {
    return finalPrice - taxAmount;
  }

  return finalPrice;
};

const getRoomOfferFlag = (room) => {
  const features = room?.features || {};
  if (room?.isOffer !== undefined && room?.isOffer !== null) {
    return toBoolean(room.isOffer);
  }
  return toBoolean(features?.isOffer);
};

const getRoomOfferExpiry = (room) => {
  return (
    room?.offerExp ||
    room?.offerExpiry ||
    room?.offerEndDate ||
    room?.features?.offerExp ||
    room?.features?.offerExpiry ||
    room?.features?.offerEndDate ||
    null
  );
};

const getRoomOfferName = (room) => {
  return String(
    room?.offerName ||
      room?.features?.offerText ||
      room?.features?.offerName ||
      "",
  ).trim();
};

const getRoomPriceSources = (room) => {
  const pricing = room?.pricing || {};
  const explicitFinalPrice =
    toNumber(room?.finalPrice) || toNumber(pricing?.finalPrice);
  const taxPercent = getRoomTaxPercent(room);
  const taxAmount = getRoomTaxAmount(room);
  const derivedPreTaxFromFinal = derivePreTaxPrice(
    explicitFinalPrice,
    taxPercent,
    taxAmount,
  );
  const listedPrice =
    toNumber(room?.price) ||
    toNumber(pricing?.price) ||
    toNumber(pricing?.basePrice) ||
    derivedPreTaxFromFinal;

  return {
    originalPrice:
      toNumber(room?.originalPrice) || toNumber(pricing?.originalPrice),
    listedPrice,
    explicitFinalPrice,
    taxPercent,
    taxAmount,
  };
};

const getRoomOfferDiscount = (room, sources = getRoomPriceSources(room)) => {
  const explicitDiscount = toNumber(
    room?.offerPriceLess ||
      room?.offerDiscount ||
      room?.offerAmount ||
      room?.features?.offerPriceLess ||
      room?.features?.offerDiscount ||
      room?.features?.offerAmount,
  );
  if (explicitDiscount > 0) return explicitDiscount;

  if (!getRoomOfferFlag(room)) return 0;

  const listedPrice = toNumber(sources?.listedPrice);
  const explicitFinalPrice = toNumber(sources?.explicitFinalPrice);
  const taxPercent = toNumber(sources?.taxPercent);
  const taxAmount = toNumber(sources?.taxAmount);
  const preTaxFinal = derivePreTaxPrice(explicitFinalPrice, taxPercent, taxAmount);

  if (listedPrice > 0 && preTaxFinal > 0 && listedPrice > preTaxFinal) {
    return listedPrice - preTaxFinal;
  }

  const originalPrice = toNumber(sources?.originalPrice);
  if (originalPrice > 0 && explicitFinalPrice > 0 && originalPrice > explicitFinalPrice) {
    return originalPrice - explicitFinalPrice;
  }

  return 0;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isRoomOfferActive = (room, now = new Date()) => {
  if (!room || !getRoomOfferFlag(room)) return false;

  const expiryValue = getRoomOfferExpiry(room);
  if (!expiryValue) return true;
  const expiryDate = toDate(expiryValue);
  if (!expiryDate) return false;

  return expiryDate.getTime() >= now.getTime();
};

export const getRoomFinalPrice = (room, now = new Date()) => {
  const { originalPrice, listedPrice, explicitFinalPrice, taxPercent, taxAmount } =
    getRoomPriceSources(room);
  const hasOffer = isRoomOfferActive(room, now);
  const offerDiscount = hasOffer ? getRoomOfferDiscount(room) : 0;

  const basePriceForOffer = Math.max(originalPrice, listedPrice, 0);
  const hasBasePriceForOffer = basePriceForOffer > 0;

  if (hasOffer && offerDiscount > 0 && hasBasePriceForOffer) {
    // If backend already sends discounted finalPrice, trust it.
    if (explicitFinalPrice > 0 && explicitFinalPrice < basePriceForOffer) {
      return explicitFinalPrice;
    }

    return Math.max(basePriceForOffer - offerDiscount, 0);
  }

  if (hasOffer && explicitFinalPrice > 0 && listedPrice > 0) {
    const preTaxFinal = derivePreTaxPrice(explicitFinalPrice, taxPercent, taxAmount);
    if (preTaxFinal > 0 && preTaxFinal < listedPrice) {
      return preTaxFinal;
    }
  }

  if (
    explicitFinalPrice > 0 &&
    listedPrice > 0 &&
    explicitFinalPrice < listedPrice
  ) {
    return explicitFinalPrice;
  }
  if (listedPrice > 0) return listedPrice;
  if (explicitFinalPrice > 0) return explicitFinalPrice;
  if (originalPrice > 0) return originalPrice;

  return 0;
};

export const getRoomOriginalPrice = (room, now = new Date()) => {
  const sources = getRoomPriceSources(room);
  const { originalPrice, listedPrice } = sources;
  if (originalPrice > 0) return originalPrice;

  const finalPrice = getRoomFinalPrice(room, now);
  const offerDiscount = isRoomOfferActive(room, now)
    ? getRoomOfferDiscount(room, sources)
    : 0;

  if (listedPrice > 0 && listedPrice >= finalPrice) return listedPrice;
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
    const firstFinal = getRoomFinalPrice(first, now);
    const secondFinal = getRoomFinalPrice(second, now);
    return firstFinal - secondFinal;
  })[0];

  const finalPrice = getRoomFinalPrice(roomWithBestDeal, now);
  const originalPrice = getRoomOriginalPrice(roomWithBestDeal, now);
  const discountAmount = Math.max(
    0,
    getRoomOfferDiscount(roomWithBestDeal),
    originalPrice - finalPrice,
  );

  if (!(discountAmount > 0 && originalPrice > finalPrice)) {
    return {
      hasOffer: false,
      offerName: "",
      finalPrice: 0,
      originalPrice: 0,
      discountAmount: 0,
      offerExp: null,
    };
  }

  return {
    hasOffer: true,
    offerName: getRoomOfferName(roomWithBestDeal),
    finalPrice,
    originalPrice,
    discountAmount,
    offerExp: getRoomOfferExpiry(roomWithBestDeal),
  };
};
