const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')
const cluster = require('hierarchical-clustering')
const stringify = require('json-stringify-pretty-compact')

;(async () => {
    var columnTypes = {
        booleans: 'Red Ylw Grn Blu Blck Wht Orng Prp Hor Ver Dgn'.split(' '),
        numerics: 'NC Crl Thrng Str Mon Syml Eng Crs Ism Sun Sqr'.split(' ')
    }
    
    var columns = {
        ID: {}
    }
    
    for (let column of columnTypes.booleans) {
        columns[column] = {
            type: 'boolean'
        }
    }
    
    for (let column of columnTypes.numerics) {
        columns[column] = {
            type: 'number'
        }
    }
    
    // // راه اندازی مرورگر
    // const browser = await puppeteer.launch({
    //     executablePath: path.resolve(process.env['LOCALAPPDATA'], 'Google/Chrome SxS/Application/chrome.exe'),
    //     defaultViewport: null,
    //     headless: false,
    // })

    // const page = await browser.newPage()

    // await page.goto(path.resolve('./flags1.htm'))

    // // خواندن دیتا از فایل اچ تی ام
    // const frame = await (await page.$('frameset > frame:nth-child(1)')).contentFrame()
    // let data = await frame.evaluate(() => {
    //     var data = [...document.querySelector('tbody').children].map(row => {
    //         const children = [...row.children]
    //         children.length = 23
    //         return children.map(td => td.textContent.trim())
    //     })
        
    //     data.pop()
    //     return data
    // })
    
    let data = require('./data.json')
    
    var reversedData = {}
    
    // ستونی کردن داده ها
    for (let i = 0; i < data[1].length; i++) {
        reversedData[data[1][i]] = []
        for (let j = 2; j < data.length; j++) {
            reversedData[data[1][i]].push(data[j][i])
        }
    }
    
    // اعتبارسنجی و تبدیل رشته به عدد
    for (let column in reversedData) {
        reversedData[column] = reversedData[column].map(data => {
            if (columnTypes.booleans.includes(column) && !['', '1'].includes(data)) {
                console.error('invalid boolean', data)
                return 0
            }
            if (isFinite(data)) {
                return +data
            } else {
                console.error('invalid data', data)
                return 0
            }
        })
    }
    
    // نرمال سازی داده ها
    for (let column in reversedData) {
        /** @type {Array<number>} */
        const numbers = reversedData[column]
        if (columnTypes.numerics.includes(column)) {
            const max = Math.max(...numbers)
            const min = Math.min(...numbers)
            columns[column].min = min
            columns[column].max = max
            reversedData[column] = numbers.map(n => (n - min) / (max - min))
        }
    }    
    
    var finalData = {
        columns: Object.keys(reversedData),
        values: []
    }
    
    // برگرداندن به حالت سطری
    for (let i = 0; i < reversedData.ID.length; i++) {
        finalData.values[i] = []
        for (let column in reversedData) {
            if (column == 'ID') continue
            finalData.values[i].push(reversedData[column][i])
        }
    }
    
    // محاسبه فاصله دو رکورد
    function distance(a, b) {
        let sum = 0
        for (let i=0; i<a.length; i++) {
            sum += (a[i] - b[i]) ** 2
        }
        return sum ** 0.5
    }
    
    // خوشه بندی
    const result = cluster({
        input: finalData.values,
        linkage: 'complete', // 'single', 'average', 'complete'
        distance
    })

    // ایجاد ساختمان داده مناسب برای بصری سازی
    function createVisualizeObject(parentList = result[result.length-1].clusters[0], levelIndex = result.length-1) {
        const level = result[levelIndex]

        if (levelIndex == 0) {
            return {
                n: '(' + parentList.join(',') + ')',
                d: 0,
                c: []
            }
        }

        const subClusters = level.clusters
        .filter(cluster => {
            if (!Array.isArray(parentList)) return true
            return parentList.includes(cluster[0])
        })

        // if sub-cluster is same as current-cluster
        if (subClusters.length == 1 && levelIndex > 0) {
            return createVisualizeObject(subClusters[0], levelIndex-1)
        }

        return {
            n: '(' + parentList.join(',') + ')',
            d: level.linkage,
            c: subClusters.map(cluster => createVisualizeObject(cluster, levelIndex-1))
        }

    }

    // ذخیره نتایج
    fs.writeFileSync('./visualizer-dendrogram/src/examples/datamining.json', stringify(createVisualizeObject()))
    fs.writeFileSync('./visualizer-dendrogram/src/examples/datamining.js', 'jsonp(' + stringify(createVisualizeObject()) + ')')
    
    fs.writeFileSync('./result.json', stringify(result))
    
})()