function roundPrice(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampDiscount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatArs(amount, options = {}) {
  const { alwaysDecimals = false } = options;
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Consultar precio";
  const hasDecimals = Math.abs(value % 1) > 0.000001;
  return `$${value.toLocaleString("es-AR", {
    minimumFractionDigits: alwaysDecimals || hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function getProductPricing(product) {
  const listPrice = Number.isFinite(product?.price) ? product.price : null;
  if (!Number.isFinite(listPrice)) {
    return {
      hasPrice: false,
      listPrice: null,
      cashDiscountPercent: 0,
      installmentCoefficientPercent: 0,
      cashPrice: null,
      installmentCount: 3,
      installmentTotal: null,
      installmentPrice: null,
      hasDiscount: false,
      hasInstallmentMarkup: false,
    };
  }

  const cashDiscountPercent = clampDiscount(product?.cashDiscountPercent);
  const installmentCoefficientPercent = clampPercent(product?.installmentCoefficientPercent);
  const cashPrice = roundPrice(listPrice * (1 - cashDiscountPercent / 100));
  const installmentCount = 3;
  const installmentTotal = roundPrice(listPrice * (1 + installmentCoefficientPercent / 100));
  const installmentPrice = roundPrice(installmentTotal / installmentCount);

  return {
    hasPrice: true,
    listPrice,
    cashDiscountPercent,
    installmentCoefficientPercent,
    cashPrice,
    installmentCount,
    installmentTotal,
    installmentPrice,
    hasDiscount: cashDiscountPercent > 0,
    hasInstallmentMarkup: installmentCoefficientPercent > 0,
  };
}

export function ProductPriceBlock({ product, variant = "card" }) {
  const pricing = getProductPricing(product);

  if (!pricing.hasPrice) {
    return <div className={`price-block price-block--${variant}`}>Consultar precio</div>;
  }

  if (variant === "detail") {
    return (
      <div className="price-block price-block--detail">
        <div className="price-block__summary">Total con tarjeta {formatArs(pricing.installmentTotal, { alwaysDecimals: true })}</div>

        <div className="price-block__transfer-line">
          <strong>{formatArs(pricing.cashPrice)}</strong>
          <span>con Transferencia</span>
        </div>

        <div className="price-block__installments-detail">
          <strong>{pricing.installmentCount} cuotas de {formatArs(pricing.installmentPrice, { alwaysDecimals: true })}</strong>
          <span>con tarjeta</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`price-block price-block--${variant}`}>
      <div className="price-block__cash">
        <span>{variant === "detail" ? "Precio transferencia" : "Transferencia"}</span>
        <strong>{formatArs(pricing.cashPrice)}</strong>
      </div>

      <div className="price-block__installments">
        <span>{pricing.installmentCount} cuotas de</span>
        <strong>{formatArs(pricing.installmentPrice, { alwaysDecimals: true })}</strong>
        <span>con tarjeta</span>
      </div>
    </div>
  );
}
