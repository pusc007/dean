var Float = {
  mix: function (a, b, t) {
    return a * (1 - t) + b * t;
  },
  inverseMix: function (a, b, t) {
    return (t - a) / (b - a);
  },
};
window.Float = Float;
