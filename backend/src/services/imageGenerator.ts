import { createCanvas, registerFont } from 'canvas';

export async function generateImage(
  text: string,
  bgColor: string = '#FFFFFF'
): Promise<Buffer> {
  // Размер для Instagram (квадрат)
  const width = 1080;
  const height = 1080;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Фон
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Текст
  ctx.fillStyle = getContrastColor(bgColor);
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Разбиваем текст на строки
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > width - 100 && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());

  // Рисуем текст
  const lineHeight = 90;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  return canvas.toBuffer('image/png');
}

function getContrastColor(hexColor: string): string {
  // Удаляем # если есть
  const hex = hexColor.replace('#', '');
  
  // Преобразуем в RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Вычисляем яркость
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Возвращаем черный или белый
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
