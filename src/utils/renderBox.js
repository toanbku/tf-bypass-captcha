import labels from "./labels.json";

/**
 * Render prediction boxes
 * @param {HTMLCanvasElement} canvasRef canvas tag reference
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 * @param {Array[Number]} ratios boxes ratio [xRatio, yRatio]
 */
export const renderBoxes = (
  canvasRef,
  reCaptchaRef,
  captchaData,
  boxes_data,
  scores_data,
  classes_data,
  ratios
) => {
  const ctx = canvasRef.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  const colors = new Colors();

  // font configs
  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";

  const captchaStatus = new Array(9).fill(false);

  for (let i = 0; i < scores_data.length; ++i) {
    // filter based on class threshold
    const klass = labels[classes_data[i]];
    const color = colors.get(classes_data[i]);
    const score = (scores_data[i] * 100).toFixed(1);

    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);

    const x1original = x1 / ratios[0];
    const x2original = x2 / ratios[0];
    const y1original = y1 / ratios[1];
    const y2original = y2 / ratios[1];

    x1 *= ratios[0];
    x2 *= ratios[0];
    y1 *= ratios[1];
    y2 *= ratios[1];

    const width = x2 - x1;
    const height = y2 - y1;

    // draw box.
    ctx.fillStyle = Colors.hexToRgba(color, 0.2);
    ctx.fillRect(x1, y1, width, height);

    // draw border box.
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(
      Math.min(ctx.canvas.width, ctx.canvas.height) / 200,
      2.5
    );
    ctx.strokeRect(x1, y1, width, height);

    // Draw the label background.
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(klass + " - " + score + "%").width;
    const textHeight = parseInt(font, 10); // base 10
    const yText = y1 - (textHeight + ctx.lineWidth);
    ctx.fillRect(
      x1 - 1,
      yText < 0 ? 0 : yText, // handle overflow label box
      textWidth + ctx.lineWidth,
      textHeight + ctx.lineWidth
    );

    // Draw labels
    ctx.fillStyle = "#ffffff";
    ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 0 : yText);

    // Click on reCaptcha iframe
    if (klass === captchaData.key) {
      handleClickOnCaptchaImage(
        reCaptchaRef,
        captchaStatus,
        x1original,
        y1original,
        x2original,
        y2original
      );
    }
  }
};

const handleClickOnCaptchaImage = (
  reCaptchaRef,
  captchaStatus,
  x1,
  y1,
  x2,
  y2
) => {
  const xs = 7,
    ys = 127,
    xe = 393,
    ye = 513,
    c = 95,
    g = 2;

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const xi1 = xs + i * c + (i > 0 ? (i - 1) * g : 0);
      const yi1 = ys + j * c + (j > 0 ? (j - 1) * g : 0);

      const xi2 = xi1 + c;
      const yi2 = yi1 + c;

      if (isOverlapping(x1, y1, x2, y2, xi1, yi1, xi2, yi2)) {
        if (!captchaStatus[i * 4 + j]) {
          captchaStatus[i * 4 + j] = true;
          reCaptchaRef.contentWindow.document
            .elementFromPoint(xi1 + 10, yi1 + 10)
            .click();
        }
      } else {
        // do nothing
      }
    }
  }
};

const isOverlapping = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  // Check if one rectangle is to the left of the other
  if (x2 < x3 || x4 < x1) {
    return false;
  }

  // Check if one rectangle is above the other
  if (y2 < y3 || y4 < y1) {
    return false;
  }

  // If the above conditions are not met, the rectangles overlap
  return true;
};

class Colors {
  // ultralytics color palette https://ultralytics.com/
  constructor() {
    this.palette = [
      "#FF3838",
      "#FF9D97",
      "#FF701F",
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
    ];
    this.n = this.palette.length;
  }

  get = (i) => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex, alpha) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${[
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ].join(", ")}, ${alpha})`
      : null;
  };
}
