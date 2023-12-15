const express = require('express');
const app = express();
const mysql = require('mysql2');
var path = require('path');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const cookieParser = require('cookie-parser');
const sessions = require('express-session');

const oneHour = 1000 * 60 * 60 * 1;

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessions({
    secret: "some secret",
    saveUninitialized: true,
    cookie: { maxAge: oneHour },
    resave: false
}));

const connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'pokemon_project', // this is the NAME of your DB 
        port: '8889', // this PORT for MAMP only
        multipleStatements: true,
    }
);

connection.connect((err) => {
    if (err) {
        return console.log(err.message)
    } else {
        return console.log(`Connection to local MySQL DB.`)
    };
});

app.get("/", (req, res) => {

    res.render('login');

});

app.get('/filter', (req, res) => {
    let filter = req.query.sort;
    let pokemonSQL = `SELECT Card_ID, Name, HP, Rarity, Pokemon_Type, ImgPath FROM pokemon_card ORDER BY ${filter}`;

    connection.query(pokemonSQL, (err, result) => {
        if (err) throw err;
        res.render('menu', { pokemonlist: result });
    });
});

app.get('/menu', (req, res) => {
    let pokemonSQL = " SELECT Card_ID, Name, HP, Rarity, ImgPath, Pokemon_Type FROM pokemon_card ";

    connection.query(pokemonSQL, (err, result) => {
        if (err) throw err;
        let pokemonSQL2 = "SELECT * FROM login_table";

        connection.query(pokemonSQL2, (err, result2) => {
            if (err) throw err;

            res.render('menu', { pokemonlist: result, memberlist:result2});
        });
    });
});

app.get('/admin/add', (req, res) => {

res.render('add');

});

app.post('/admin/add', (req, res) => {

    const pokeN = connection.escape(req.body.pokemonname); //get data from <input type="text" name="pokemonname">
    const pokeH = connection.escape(req.body.pkHP);
    const pokeR = connection.escape(req.body.pkRarity);
    const pokeT = connection.escape(req.body.pkType);
    const pokeI = connection.escape(req.body.image);
    const memberU = connection.escape(req.body.userID);

    const InsertPokemonSQL = `INSERT into pokemon_card (Name, HP, Rarity, Pokemon_Type, ImgPath, member_ID) values (${pokeN}, ${pokeH}, ${pokeR} ,${pokeT},${pokeI},${memberU}); `;
    connection.query(InsertPokemonSQL, (err, result) => {
        if (err) throw err;
        res.send(`Pokemon ${pokeN} Added to the system <a href='/menu'>Back to Menu</a> `);
    });
});

app.get('/admin/addmember', (req, res) => {

    res.render('addmember');

});

app.post('/admin/addmember', (req, res) => {

    const memberN = connection.escape(req.body.membername); //get data from <input type="text" name="membername">
    const memberE = connection.escape(req.body.email);
    const memberP = connection.escape(req.body.password);

    const InsertMemberSQL = `INSERT into login_table (Username, Email, Password) values (${memberN}, ${memberE}, ${memberP}); `;
    connection.query(InsertMemberSQL, (err, result) => {
        if (err) throw err;
        res.send(`${memberN} Added to the system <a href='/'>Login</a> `);
    });
});

app.post('/', (req, res) => {
    const username = req.body.usernameField;
    const userpassword = req.body.passwordField;

   // Execute SQL query that'll select the account from the database based on the specified username and password
const checkuser = `SELECT * FROM login_table WHERE Username = '${username}' AND Password = '${userpassword}'; `; 

connection.query(checkuser,(err, results)=>{
    if(err) throw err;
    if(results.length > 0){
        const userID = results[0].User_ID;
        req.session.userId = userID;
        res.redirect('/profile');
    }else{
        res.redirect('/');
    }
    });
});

app.get('/profile', (req, res) => {
    const uid = req.session.userId;

    const writereadsql= `SELECT * FROM pokemon_card WHERE member_ID = '${uid}'; `; 
    
    connection.query(writereadsql,(err, results)=>{
        if(err) throw err;
        res.render('usercards', { cards : results} )
    })

	//res.send(`user ID is: ${writereadsql}`)
});

app.get('/edit', (req, res) => {

    const pokemonSQL = `SELECT * FROM pokemon_card`;

    connection.query(pokemonSQL, (err, rows) => {
        if (err) throw err;
        res.render('edit', { pokemonlist: rows });
    });

});

app.get('/editpokemon', (req, res) => {

    const poke_id = req.query.eid;
    const onepokesql = `SELECT * FROM pokemon_card WHERE Card_ID = ${poke_id}`;

    connection.query(onepokesql, (err, row) => {
        if (err) throw err;
        res.render('pokemonupdate', { pokemonlist: row });
    });
});

app.post('/editpokemon', (req, res) => {

    const id_update = req.body.Card_ID_field;
    const name_update = req.body.Name_field;

    const updateSQL = `UPDATE pokemon_card SET Name='${name_update}'
                      WHERE Card_ID = '${id_update}';  `;

    connection.query(updateSQL, (err, result) => {
        if (err) throw err;
        res.send(`Data from form element. The row id ... ${id_update} title
                  will update to ... ${name_update} <a href='/editp'>Back to edit Page</a> `);
    });

});

app.get('/deletepokemon', (req, res) => {

    const poke_id = req.query.eid;
    const onepokesql = `SELECT * FROM pokemon_card WHERE Card_ID = ${poke_id}`;

    connection.query(onepokesql, (err, row) => {
        if (err) throw err;
        res.render('pokemondeleteupdate', { pokemonlist: row });
    });
});

app.post('/deletepokemon', (req, res) => {

    const id_delete = req.body.Card_ID_field;
    const name_delete = req.body.Name_field;
    const DeleteSQL = `Delete FROM pokemon_card WHERE Card_ID='${id_delete}'  `;

    connection.query(DeleteSQL, (err, result) => {
        if (err) throw err;
        res.send(`Pokemon ${name_delete} deleted <a href='/editp'>Back to edit Page</a> `);
    });

});

app.get('/editp', (req, res) => {

    const limit = 10; // number of records per page
    let offset = 0; // default value for first visit
    const page = req.query.page; // get query parameter 'page' value
    offset = (page - 1) * limit; // returns the next incremented by using the query parameter page + 10 
    if (Number.isNaN(offset)) offset = 0;  // if no query parameter 'page' then change offset back to = 0

    const pokemonsql = `SELECT Card_ID FROM pokemon_card;
    SELECT * FROM pokemon_card LIMIT ${limit} OFFSET ${offset};`;

    connection.query(pokemonsql, (err, rows) => {
        if (err) throw err;
        const totalRows = rows[0].length;
        const pageCount = Math.ceil(totalRows / limit);
        res.render('edit', { pokemonlist: rows[1], num_pages: pageCount });
    });
});

app.get('/CardInfo', (req, res) => {

    const poke_id = req.query.eid;
    const onepokesql = `SELECT * FROM(( pokemon_card INNER JOIN pokemon_moves ON pokemon_card.PrimMove_ID = pokemon_moves.Move_ID) INNER JOIN login_table ON pokemon_card.member_ID = login_table.User_ID) WHERE Card_ID = ${poke_id}`;

    connection.query(onepokesql, (err, row) => {
        if (err) throw err;
        res.render('Cardinfo', { pokemonlist: row });
    });
});

app.listen(3000, () => {
    console.log('Server is listening on localhost:3000');
});
