var express = require('express');
var app = express();

var mysql = require('mysql');
var fs = require('fs');

app.use(express.static('frontEnd'))

var con = mysql.createConnection({
  host: "",
  user: "",
  password: "",
  database:""
});

app.listen('3000', () => {
    console.log('Server started on port 3000');
});

app.get('/', function (req, res) {
    // app.use(express.static('index.html'))
    res.send('Hello World');
    
    con.connect(function(err) {
        if (err) throw err;
        async function updateDB(){

            let div = await getDividends('JNJ'); 
            console.log(div);
            res.send(div);
        }
        updateDB();
    });

 })
 
 var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
 
    console.log("Example app listening at http://%s:%s", host, port);
    console.log('test');
 })
let fileData= fs.readFileSync('data/newData.json');
var words = JSON.parse(fileData);


let updateTickers=()=>{

    return new Promise(resolve =>{
        
    let tickers=[];
    for(key in words){
        tickers.push([key,words[key].name,words[key].exDiv.toString(),words[key].payDate.toString(),words[key].dividend.toString(),words[key].country]);
    }
    console.log(tickers);

        async function updateTickerList(){
            console.log("Connected!");
            let len = await getLength(); //auto increment skip fix
            let alter="ALTER TABLE tickers AUTO_INCREMENT ="+len;
            con.query(alter,function (err,res){
                if (err) throw err;
                console.log('Table altered');
            })
            // Check if ticker already exist and modify or add new
            var sql = "INSERT INTO tickers (ticker,name,exDiv,payDate,dividend,country) VALUES ? ON DUPLICATE KEY UPDATE ticker = VALUES(ticker), name = VALUES(name), exDiv = VALUES(exDiv), payDate = VALUES(payDate), dividend = VALUES(dividend), country = VALUES(country), dividendType = VALUES(dividendType)";
            con.query(sql, [tickers], function (err, result) {  
                if (err) throw err;
                console.log("Number of records inserted: " + result.affectedRows);
                resolve('Update tickers ready');
            });
        }
    updateTickerList();
    });  
}

let updateDividends=()=>{
    return new Promise(resolve =>{
        let mySql=(key)=>{
            console.log(key)
            return new Promise(resolve =>{
                        con.query("SELECT * FROM tickers Where ticker ='"+key+"'", function (err, result) {
                    if (err) throw err;
                            resolve(result[0].id);
                    });
                });
        
        }
        async function getData(){
            let dividendData=[];
            let len = await getLength(); //auto increment skip fix
            let alter="ALTER TABLE dividends AUTO_INCREMENT ="+len;
            for(key in words){
                for(var i=0;i<words[key].payDate.length;i++){
                    let result = await mySql(key);

                    let exDiv = changeDate(words[key].exDiv[i]);
                    let payDate = changeDate(words[key].payDate[i]);
                    // console.log(payDate);
                    if(payDate=="undefined-NaN-"){
                        payDate=exDiv;
                    };
                    let monthID =key+words[key].payDate[i].split('.')[1];

                    dividendData.push([exDiv,payDate,monthID,words[key].dividend[i],result]);
                }
            }
            // console.log(dividendData);
            console.log("Connected!");
            var sql = "INSERT INTO dividends (exDiv,payDate,monthID,dividend,ticker_id) VALUES ? ON DUPLICATE KEY UPDATE exDiv = VALUES(exDiv),payDate = VALUES(payDate)";
            con.query(sql, [dividendData], function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted: " + result.affectedRows);
                resolve('Update dividends ready');
            });
        }
        getData(); 
        let changeDate=(date)=>{
            date=date.split('.')
            let newDate = date[2]+'-'+date[1]+'-'+date[0];
            return newDate;
        }
    });
}

let updateDividendType=()=>{
    return new Promise(resolve =>{
        let dividendList=[];
        con.query("SELECT ticker_id, COUNT(ticker_id) FROM dividends GROUP BY ticker_id;", function (err, result, fields) {
        if (err) throw err;
        data = result;
            for(var i=0;i<data.length;i++){
            // console.log(data[i].ticker_id,data[i]['COUNT(ticker_id)']);
            let type=getType(data[i]['COUNT(ticker_id)']);
            con.query("UPDATE tickers set dividendType = "+type+" where id ="+data[i].ticker_id);
            resolve('Update dividend type ready');
        }
        })
        function getType(len){
            let type=undefined;
            switch (len){
                case 1:
                    type='Annual';
                    break;
                case 2:
                    type='Semi-Annual';
                    break;
                case 4:
                    type='Quarterly';
                    break;
                case 12:
                    type='Monthly';
                    break;
                default:
                    type = len;
                    break;
            }
            return "'"+type+"'";
        } 
    });
}

let getTickers=()=>{
    return new Promise(resolve =>{
    let tickers={};
    con.query("SELECT ticker FROM tickers", function (err, result, fields) {
        if (err) throw err;
        for(var i=0;i<result.length;i++){
            tickers[result[i].ticker]=result[i].ticker;
        }
            // console.log(tickers);
            resolve(tickers);
        });
    });
}

let getDividends=(ticker)=>{
    return new Promise(resolve =>{
    let dividends={};
    con.query("SELECT * from tickers JOIN dividends ON tickers.id = dividends.ticker_id WHERE ticker = '"+ticker+"'", function (err, result, fields) {
        if (err) throw err;
            // console.log(tickers);
            for(var i=0;i<result.length;i++){
                // console.log(result[i].payDate);
            }
            resolve(result);
        });
    });
}

con.connect(function(err) {
    if (err) throw err;
    async function updateDB(){
        console.log(await updateTickers());
        // console.log(await updateDividends());
        // console.log(await updateDividendType());
        // let tickers = await getTickers();
        // let div = await getDividends('CIBUS'); 
        // console.log(div);
    }
    updateDB();
});


let getLength=()=>{
    return new Promise(resolve =>{
            con.query("select COUNT(*) from tickers;", function (err, result, fields) {
            if (err) throw err;
            resolve(result[0]['COUNT(*)']);
        });
    });      
}

