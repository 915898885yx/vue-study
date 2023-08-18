// import puppeteer from 'puppeteer'
const puppeteer = require('puppeteer')
const html2canvas = require('html2canvas')
// 你无需理解参数都是什么作用
function easeOutBounce(t, b, c, d) {
    if ((t /= d) < 1 / 2.75) {
      return c * (7.5625 * t * t) + b;
    } else if (t < 2 / 2.75) {
      return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75) + b;
    } else if (t < 2.5 / 2.75) {
      return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375) + b;
    } else {
      return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375) + b;
    }
}

const init = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1200,
            height: 800,
        },
        args: [
            '--no-sandbox',
            '--disable-web-security',
            '--window-size=1600,800',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        devtools: true
    })
    // 创建新的标签页
    const page = await browser.newPage()
    // 跳转到掘金登录页面
    await page.goto('https://www.teacherin.vip/login');
    await page.waitForSelector('#form_item_fullNumber');
    await page.waitForSelector('#form_item_password');
    await page.waitForSelector('#form_item_agree');
    await page.waitForSelector('button[type=submit]')
    
    await page.type('#form_item_fullNumber', '17310526744');
    await page.type('#form_item_password', '17310526744a')
    await page.click('#form_item_agree')
    await page.click('button[type=submit]')
    await page.waitForTimeout(2000)
    const tencentCodePositioin = await page.evaluate(async () => {
      const el = document.querySelector('#tcaptcha_transform_dy')
      const boundingBox = el.getBoundingClientRect()
      return {
        x: boundingBox.x,
        y: boundingBox.y
      }
    })
    const frame = await page.frames()[0]
    const childFrame = frame.childFrames()[0]
    const dragPosition = await childFrame.evaluate(async (childPage) => {
      const oScript = document.createElement('script')
      oScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      document.head.appendChild(oScript)
      await new Promise((resolve => {
        oScript.onload = () => {
          resolve()
        }
      }))
      const box = document.querySelector('#slideBg')
      box.style.width = '340px'
      const url = box.style.backgroundImage.split('"')[1]
      console.log(url, 'urk')
      const oImg = document.createElement('img')
      oImg.src = url
      oImg.style.width = '340px'
      oImg.style.height = '197px'
      oImg.style.position = 'fixed'
      oImg.style.top = '0'
      oImg.style.zIndex = 100
      await new Promise((resolve) => {
        oImg.onload = () => {
          resolve()
        }
      })
      const canvas = await html2canvas(box, {
        width: 340,
        height: 197,
        useCORS: true
      })
      
      canvas.style.position = 'fixed'
      canvas.style.top = '0px'
      canvas.style.zIndex = 1000
      canvas.style.left = '10px'
      // document.body.appendChild(canvas)
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = [];
      for (let h = 0; h < canvas.height; h++) {
          data.push([]);
          for (let w = 0; w < canvas.width; w++) {
              const index = (h * canvas.width + w) * 4;
              const r = imageData.data[index] * 0.2126;
              const g = imageData.data[index + 1] * 0.7152;
              const b = imageData.data[index + 2] * 0.0722;
              
              if (r + g + b > 100) {
                  data[h].push(1);
              } else {
                  data[h].push(0);
              }
          }
      }

      let maxChangeCount = 0;
      let coordinateShift = 0;
      for (let w = 0; w < canvas.width; w++) {
        let changeCount = 0;
        for (let h = 0; h < canvas.height; h++) {
          if (data[h][w] == 0 && data[h][w - 1] == 1) {
            changeCount++;
          }
        }
        if (changeCount > maxChangeCount) {
          maxChangeCount = changeCount;
          coordinateShift = w;
        }
      }
      const drag = document.querySelector('.tc-fg-item')
      const boundingBox = drag.getBoundingClientRect()
      return {
        coordinateShift: coordinateShift / window.devicePixelRatio - 40,
        el: {
          x: boundingBox.x + (boundingBox.width / 2),
          y: boundingBox.y + (boundingBox.height / 2)
        }
      };
    })
    console.log(tencentCodePositioin, dragPosition, 'result')
    const dragX = tencentCodePositioin.x + dragPosition.el.x;
    const dragY = tencentCodePositioin.y + dragPosition.el.y;
    
    await page.mouse.move(dragX, dragY);
    await page.mouse.down();
    await page.waitForTimeout(300);
    
    // 定义每个步骤的时间和总时间
    const totalSteps = 100;
    const stepTime = 5;
    
    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps; 
      const easeT = easeOutBounce(t, 0, 1, 1);
    
      const newX = dragX + dragPosition.coordinateShift * easeT - 5;
      const newY = dragY + Math.random() * 10;
    
      await page.mouse.move(newX, newY, { steps: 1 });
      await page.waitForTimeout(stepTime);
    }
    await page.waitForTimeout(800);
    await page.mouse.up();
}
const fn = async () => {
  try {
    init()
  } catch (e) {
    await page.waitForTimeout(3000)
    init
  }
}
fn()

