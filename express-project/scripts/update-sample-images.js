const { getDB } = require('../utils/db');
const fs = require('fs');
const path = require('path');
const https = require('https');

class ImageUpdater {
  constructor() {
    this.newAvatarLinks = [];
    this.newImageLinks = [];
  }

  loadLinksFromFile(filename) {
    try {
      const filePath = path.join(__dirname, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      return content.trim().split('\n').filter(link => link.trim());
    } catch (error) {
      console.error(`读取文件 ${filename} 失败:`, error);
      return [];
    }
  }

  getRandomImageUrl(imageType = 'post') {
    const links = imageType === 'avatar' ? this.newAvatarLinks : this.newImageLinks;
    if (links.length === 0) {
      console.warn(`没有可用的${imageType === 'avatar' ? '头像' : '笔记'}图片链接`);
      return null;
    }
    const randomIndex = Math.floor(Math.random() * links.length);
    return links[randomIndex];
  }

  isTcAlcyImage(url) {
    return url && typeof url === 'string' && url.includes('tc.alcy.cc');
  }

  async updateUserAvatars() {
    console.log('开始更新用户头像...');
    const db = getDB();

    try {
      const users = await db('users')
        .select('id', 'avatar')
        .where('avatar', 'like', '%tc.alcy.cc%');

      console.log(`找到 ${users.length} 个需要更新的用户头像`);

      let updatedCount = 0;
      for (const user of users) {
        if (this.isTcAlcyImage(user.avatar)) {
          const newAvatarUrl = this.getRandomImageUrl('avatar');
          if (newAvatarUrl) {
            await db('users')
              .where('id', user.id)
              .update({ avatar: newAvatarUrl });
            updatedCount++;
          }
        }
      }

      console.log(`用户头像更新完成，共更新 ${updatedCount} 个头像`);
    } catch (error) {
      console.error('❌ 更新用户头像失败:', error);
      throw error;
    }
  }

  async updatePostImages() {
    console.log('开始更新笔记图片...');
    const db = getDB();

    try {
      const images = await db('post_images')
        .select('id', 'image_url')
        .where('image_url', 'like', '%tc.alcy.cc%');

      console.log(`找到 ${images.length} 个需要更新的笔记图片`);

      let updatedCount = 0;
      for (const image of images) {
        if (this.isTcAlcyImage(image.image_url)) {
          const newImageUrl = this.getRandomImageUrl('post');
          if (newImageUrl) {
            await db('post_images')
              .where('id', image.id)
              .update({ image_url: newImageUrl });
            updatedCount++;
          }
        }
      }

      console.log(`笔记图片更新完成，共更新 ${updatedCount} 个图片`);
    } catch (error) {
      console.error('❌ 更新笔记图片失败:', error);
      throw error;
    }
  }

  async printUpdateStats() {
    console.log('\n更新统计信息:');
    const db = getDB();

    try {
      const avatarStats = await db('users')
        .count('* as total')
        .countRaw("SUM(CASE WHEN avatar LIKE '%tc.alcy.cc%' THEN 1 ELSE 0 END)", 'as tc_alcy_count')
        .whereNotNull('avatar')
        .first();

      const imageStats = await db('post_images')
        .count('* as total')
        .countRaw("SUM(CASE WHEN image_url LIKE '%tc.alcy.cc%' THEN 1 ELSE 0 END)", 'as tc_alcy_count')
        .first();

      console.log(`用户头像: 总计 ${avatarStats.total} 个，其中 ${avatarStats.tc_alcy_count || 0} 个来自 tc.alcy.cc`);
      console.log(`笔记图片: 总计 ${imageStats.total} 个，其中 ${imageStats.tc_alcy_count || 0} 个来自 tc.alcy.cc`);
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
    }
  }

  async fetchImageLinks(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const links = data.trim().split('\n').filter(link => link.trim());
            resolve(links);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async updateImageLinkFiles() {
    try {
      const avatarLinks = await this.fetchImageLinks('https://t.alcy.cc/tx/?json&quantity=50');
      const avatarFilePath = path.join(__dirname, '../imgLinks/avatar_link.txt');
      fs.writeFileSync(avatarFilePath, avatarLinks.join('\n'), 'utf8');

      const postLinks1 = await this.fetchImageLinks('https://t.alcy.cc/moemp/?json&quantity=100');
      const postLinks2 = await this.fetchImageLinks('https://t.alcy.cc/mp/?json&quantity=200');
      const allPostLinks = [...postLinks1, ...postLinks2];
      const postFilePath = path.join(__dirname, '../imgLinks/post_img_link.txt');
      fs.writeFileSync(postFilePath, allPostLinks.join('\n'), 'utf8');

      this.newAvatarLinks = avatarLinks;
      this.newImageLinks = allPostLinks;

      console.log('图片链接文件更新完成\n');
    } catch (error) {
      console.error('❌ 更新图片链接文件失败:', error);
      throw error;
    }
  }

  async updateImages() {
    await this.updateImageLinkFiles();
    console.log(`可用头像链接: ${this.newAvatarLinks.length} 个`);
    console.log(`可用笔记图片链接: ${this.newImageLinks.length} 个\n`);

    if (this.newAvatarLinks.length === 0 && this.newImageLinks.length === 0) {
      console.error('❌ 没有可用的图片链接，请检查图片链接文件');
      return;
    }

    try {
      console.log('数据库连接成功\n');

      console.log('更新前的统计信息:');
      await this.printUpdateStats();
      console.log('');

      if (this.newAvatarLinks.length > 0) {
        await this.updateUserAvatars();
        console.log('');
      } else {
        console.log('⚠️ 跳过用户头像更新（没有可用的头像链接）\n');
      }

      if (this.newImageLinks.length > 0) {
        await this.updatePostImages();
        console.log('');
      } else {
        console.log('⚠️ 跳过笔记图片更新（没有可用的笔记图片链接）\n');
      }

      console.log('更新后的统计信息:');
      await this.printUpdateStats();

      console.log('\n图片更新完成！');
    } catch (error) {
      console.error('❌ 更新过程中发生错误:', error);
    }
  }
}

if (require.main === module) {
  const updater = new ImageUpdater();
  updater.updateImages();
}

module.exports = ImageUpdater;
