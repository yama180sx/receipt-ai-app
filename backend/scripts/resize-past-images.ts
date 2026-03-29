const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function resizeImages() {
  const files = fs.readdirSync(UPLOADS_DIR);
  console.log(`🔍 ${files.length} 個のファイルをチェック中...`);

  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;

    const filePath = path.join(UPLOADS_DIR, file);
    const metadata = await sharp(filePath).metadata();

    // 長辺が 1200px を超えている場合のみ処理
    if (metadata.width > 1200 || metadata.height > 1200) {
      console.log(`⚡ リサイズ中: ${file} (${metadata.width}x${metadata.height})`);
      
      const buffer = await sharp(filePath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      fs.writeFileSync(filePath, buffer);
      console.log(`✅ 完了: ${file}`);
    }
  }
  console.log('✨ すべての過去画像の最適化が完了しました。');
}

resizeImages().catch(console.error);