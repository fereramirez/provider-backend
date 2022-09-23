function formatDate(d) {
  if (d === undefined) {
    return "fecha invalida";
  }
  if (typeof d === "string") {
    return d.toString().slice(0, -13).replace("T", " ");
  } else {
    return new Date(d).toLocaleDateString("es-AR", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
}

function formatPrice(price) {
  if (!price) return { int: "---", cents: "--" };
  const p = price.toString();
  let cents = p.split(".")[1] || false;
  let int = p.split(".")[0];
  if (int.length > 3) {
    int = int.slice(0, -3) + "." + int.slice(-3);
  }
  if (cents.length < 2) {
    cents = cents + 0;
  }
  return { int, cents };
}

module.exports = { formatDate, formatPrice };
