const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')
const cluster = require('hierarchical-clustering')
const stringify = require('json-stringify-pretty-compact')

;(async () => {

    // const browser = await puppeteer.launch({
    //     executablePath: path.resolve(process.env['LOCALAPPDATA'], 'Google/Chrome SxS/Application/chrome.exe'),
    //     defaultViewport: null,
    //     headless: false,
    // })

    // const page = await browser.newPage()

    // await page.goto(path.resolve('./flags1.htm'))

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
    
    for (let i = 0; i < data[1].length; i++) {
        reversedData[data[1][i]] = []
        for (let j = 2; j < data.length; j++) {
            reversedData[data[1][i]].push(data[j][i])
        }
    }
    
    // Convert string to number & validate them
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
    
    // Normalize data
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
    
    function convertNormalToOriginal() { }
    
    // console.log(reversedData)
    
    
    var finalData = {
        columns: Object.keys(reversedData),
        values: []
    }
    
    for (let i = 0; i < reversedData.ID.length; i++) {
        finalData.values[i] = []
        for (let column in reversedData) {
            if (column == 'ID') continue
            finalData.values[i].push(reversedData[column][i])
        }
    }
    
    function distance(a, b) {
        let sum = 0
        for (let i=0; i<a.length; i++) {
            sum += (a[i] - b[i]) ** 2
        }
        return sum ** 0.5
    }
    
    function linkage(distances) {
        return Math.min(...distances) // single linkage
    }
    
    const result = cluster({
        input: finalData.values,
        linkage: 'complete',
        distance
    })

    
    function createVisualizeObject(levelIndex = result.length-1, parentList) {
        if (levelIndex == 0) return []
        const level = result[levelIndex]

        const subClusters = level.clusters
        .filter(cluster => {
            if (!Array.isArray(parentList)) return true
            return parentList.includes(cluster[0])
        })

        // if sub-cluster is same as current-cluster
        if (subClusters.length == 1) {
            return createVisualizeObject(levelIndex-1, subClusters[0])
        }

        return subClusters.map(cluster => ({
            n: '(' + cluster.join(',') + ')',
            d: level.linkage,
            c: createVisualizeObject(levelIndex-1, cluster, level)
        }))

    }

    fs.writeFileSync('./visualizer-dendrogram/src/examples/datamining.json', stringify(createVisualizeObject()))

    // var sortedList = [...finalData.values].sort((value1, value2) => {
    //     let d1 = distance(value1, [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
    //     let d2 = distance(value2, [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
    //     return d1 - d2
    // })

    // console.log(sortedList.map(i => distance(i, [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])))

    // frame.evaluate(result => {
    //     console.log(result)
    // //     var canvas = document.createElement('canvas')
    // //     canvas.height = window.innerHeight
    // //     canvas.width = 5000
    // //     canvas.style.position = 'absolute'
    // //     canvas.style.top = 0
    // //     canvas.style.left = 0
    // //     var ctx = canvas.getContext('2d')

    // //     let table = document.querySelector('table')

    // //     let tops = result[0].clusters.map(([row]) => table.querySelector(`tr:nth-child(${row + 3}) > td`).offsetTop)

    // //     result.forEach((level, levelIndex) => {
    // //         level.clusters.forEach(cluster => {
    // //             cluster.forEach(row => {
    // //                 createLine(row, levelIndex)
    // //             })
    // //         })
    // //     })

    // //     table.parentNode.appendChild(canvas)

    // //     function createLine(row, tab) {
    // //         // ctx.moveTo(tab * 100, tops[row]);
    // //         // ctx.lineTo(tab * 101, tops[row]);
    // //         // ctx.stroke();
    // //         // var div = document.createElement('div')
            
    // //         // div.style.width = '100px'
    // //         // div.style.background = 'red'
    // //         // div.style.height = '3px'
    // //         // div.style.position = 'absolute'
    // //         // div.style.left = tab + '00px'
            
    // //         // var idElement = table.querySelector(`tr:nth-child(${row + 3}) > td`)
    // //         // div.style.top = idElement.offsetTop + 15 + 'px'
    // //         // table.parentNode.appendChild(div)
    // //     }

    // //     table.style.opacity = .3
    // }, result)

    // await new Promise(resolve => setTimeout(resolve, 3000))
    // await browser.close()
    
    fs.writeFileSync('./result.json', stringify(result))
    
})()