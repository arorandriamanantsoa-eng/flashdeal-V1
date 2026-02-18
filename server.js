const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(bodyParser.json());

// --- 1. BASE DE DONNÉES (Compatible Node v6) ---
const DB_FILE = './database.json';

function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            // Initialisation si fichier inexistant
            const init = {
                products: [],
                sales: [],
                messages: [],
                users: [{u: "admin", p: "admin123", role: "admin"}],
                config: { name: "AMAZON V6" }
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
            return init;
        }
        
        const content = fs.readFileSync(DB_FILE, 'utf8');
        if (!content || content.trim() === "") throw new Error("Vide");

        const db = JSON.parse(content);
        
        // Sécurité : on s'assure que les tableaux existent
        if (!db.products) db.products = [];
        if (!db.sales) db.sales = [];
        if (!db.messages) db.messages = [];
        if (!db.users) db.users = [];
        if (!db.config) db.config = { name: " flashdeal V6" };
        
        return db;
    } catch (e) {
        // En cas de corruption, on répares
        const repair = {
            products: [], sales: [], messages: [], 
            users: [{u: "admin", p: "admin123", role: "admin"}], 
            config: { name: " mk " }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(repair, null, 2));
        return repair;
    }
}

// --- 2. BACKEND (Logique Serveur) ---

app.get('/api/sync', (req, res) => {
    res.json(loadDB());
});

app.post('/api/action', (req, res) => {
    const db = loadDB();
    const type = req.body.type;
    const data = req.body.data;
    const id = req.body.id;

    // Inscription
    if (type === 'register') {
        const exists = db.users.find(function(u) { return u.u === data.u; });
        if (exists) return res.json({ error: "Utilisateur déjà pris" });
        db.users.push({ u: data.u, p: data.p, role: 'client' });
    }

    // Admin : Ajouter Produit
    if (type === 'add_prod') {
        // Node v6: Utilisation de Object.assign au lieu du spread ...
        const newProd = Object.assign({}, data, { id: Date.now() });
        db.products.push(newProd);
    }

    // Admin : Supprimer
    if (type === 'del_prod') {
        db.products = db.products.filter(function(p) { return p.id !== id; });
    }

    // Client : Achat
    if (type === 'buy') {
        const order = {
            id: "CMD-" + Math.floor(Math.random() * 999999),
            date: new Date().toLocaleString(),
            product: data.product,
            price: data.price,
            user: data.user,
            address: data.address,
            cat: data.cat
        };
        db.sales.push(order);
    }

    // Chat
    if (type === 'msg') {
        const msg = Object.assign({}, data, { time: new Date().toLocaleTimeString() });
        db.messages.push(msg);
    }

    // Config
    if (type === 'config') {
        db.config.name = data.name;
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// --- 3. FRONTEND (HTML/CSS/JS) ---
// Note: Le JS ici s'exécute dans le navigateur (Chrome/Firefox), donc il peut être moderne.

const CSS = `
    :root { --nav: #131921; --nav-light: #232f3e; --orange: #febd69; --btn-hover: #f2a745; --bg: #eaeded; --white: #ffffff; }
    body { font-family: Arial, sans-serif; margin: 0; background-color: var(--bg); }
    
    /* NAV BAR AMAZON STYLE */
    .navbar { background-color: var(--nav); color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 1000; }
    .nav-logo { font-size: 24px; font-weight: bold; cursor: pointer; display:flex; align-items:center; }
    .nav-logo span { color: var(--orange); margin-left:2px; }
    
    .search-container { flex-grow: 1; margin: 0 40px; display: flex; }
    .search-input { width: 100%; padding: 10px; border: none; border-radius: 4px 0 0 4px; outline: none; }
    .search-btn { background-color: var(--orange); border: none; padding: 10px 20px; border-radius: 0 4px 4px 0; cursor: pointer; }
    
    .nav-tools { display: flex; gap: 15px; font-size: 13px; align-items: center; }
    .nav-btn { color: white; background: none; border: 1px solid transparent; padding: 5px 10px; cursor: pointer; border-radius: 3px; }
    .nav-btn:hover { border-color: white; }
    .logout-btn { background: #d00; font-weight: bold; border: none; }

    /* LAYOUT */
    .container { max-width: 1400px; margin: 20px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    
    /* CARDS */
    .card { background: var(--white); border: 1px solid #ddd; padding: 20px; border-radius: 4px; display: flex; flex-direction: column; justify-content: space-between; }
    .card h3 { margin-top: 0; color: #007185; }
    .price { font-size: 24px; font-weight: 500; color: #B12704; }
    .badge { background: #232f3e; color: white; padding: 2px 6px; font-size: 11px; border-radius: 2px; }
    
    /* BUTTONS */
    .btn-main { background: var(--orange); border: 1px solid #a88734; padding: 8px; width: 100%; border-radius: 20px; cursor: pointer; margin-top: 10px; font-weight: bold; }
    .btn-main:hover { background: var(--btn-hover); }
    
    /* CHAT */
    .chat-widget { position: fixed; bottom: 20px; right: 20px; width: 300px; background: white; border: 1px solid #ccc; border-radius: 5px; display: none; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    .chat-header { background: var(--nav-light); color: white; padding: 10px; font-weight: bold; display:flex; justify-content:space-between; cursor:pointer;}
    .chat-body { height: 200px; overflow-y: auto; padding: 10px; background: #f9f9f9; }
    .msg { padding: 5px; margin: 5px 0; border-radius: 5px; font-size: 12px; }
    .msg.me { background: #dcf8c6; text-align: right; margin-left: 20px; }
    .msg.other { background: white; border: 1px solid #ddd; margin-right: 20px; }

    /* LOGIN */
    .login-box { width: 350px; background: white; margin: 50px auto; padding: 30px; border: 1px solid #ddd; border-radius: 4px; }
    input { width: 100%; padding: 10px; border: 1px solid #a6a6a6; border-radius: 3px; margin: 5px 0 15px 0; box-sizing: border-box; }
`;

// ROUTE LOGIN
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div style="text-align:center; margin-top:20px;">
        <h1 style="font-size:40px; margin-bottom:0;"><span style="color:#000">flashdeal</span><span style="color:#febd69">.mg</span></h1>
    </div>
    <div class="login-box">
        <h2>S'identifier</h2>
        <label><b>Nom d'utilisateur</b></label>
        <input id="u" type="text">
        <label><b>Mot de passe</b></label>
        <input id="p" type="password">
        <button class="btn-main" onclick="login()">Continuer</button>
        <p style="font-size:12px; margin-top:20px;">En passant votre commande, vous acceptez les Conditions générales de vente.</p>
        <hr style="margin:20px 0; border:0; border-top:1px solid #eee;">
        <p style="text-align:center; font-size:12px; color:#555;">Nouveau chez flashdeal ?</p>
        <button style="width:100%; background:#e7e9ec; border:1px solid #888; padding:8px; border-radius:3px; cursor:pointer;" onclick="reg()">Créer votre compte flashdeal</button>
    </div>
    <script>
        function login(){
            var u = document.getElementById('u').value;
            var p = document.getElementById('p').value;
            fetch('/api/sync').then(r=>r.json()).then(db => {
                var user = db.users.find(x => x.u === u && x.p === p);
                if(user) {
                    localStorage.setItem('user', JSON.stringify(user));
                    location.href = (user.role === 'admin') ? '/admin' : '/';
                } else {
                    alert('Identifiants incorrects');
                }
            });
        }
        function reg(){
            var u = prompt("Choisissez un identifiant :");
            var p = prompt("Choisissez un mot de passe :");
            if(u && p) {
                fetch('/api/action', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({type: 'register', data: {u:u, p:p}})
                }).then(() => alert("Compte créé ! Veuillez vous connecter."));
            }
        }
    </script></body></html>`);
});

// ROUTE ADMIN
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div class="navbar">
        <div class="nav-logo">Admin<span>Portal</span></div>
        <div class="nav-tools">
            <input id="shopNameInput" placeholder="Nom Boutique" style="width:150px; margin:0; padding:5px;">
            <button class="nav-btn" style="background:#febd69; color:black" onclick="upName()">OK</button>
            <button class="nav-btn" onclick="location.reload()">?? Refresh</button>
            <button class="nav-btn logout-btn" onclick="logout()">Déconnexion</button>
        </div>
    </div>
    
    <div class="container">
        <div style="background:white; padding:20px; border:1px solid #ddd; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h2>Tableau de Bord</h2>
                <p>Ventes: <b id="nbSales">0</b> | CA: <b id="ca" style="color:#B12704">0 MGA</b></p>
            </div>
            <div id="aibox" style="background:#f0f8ff; padding:15px; border-left:5px solid #007185; font-style:italic;">
                ?? IA: Calcul en cours...
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
            <div>
                <div class="card">
                    <h3>?? Ajouter un article</h3>
                    <div style="display:flex; gap:10px;">
                        <input id="pn" placeholder="Nom Produit">
                        <input id="pp" type="number" placeholder="Prix">
                        <select id="pc" style="padding:10px; border-radius:3px;"><option>High-Tech</option><option>Mode</option><option>Maison</option></select>
                    </div>
                    <button class="btn-main" style="width:auto; padding:10px 30px;" onclick="addP()">Mettre en vente</button>
                    
                    <h3 style="margin-top:20px; border-top:1px solid #eee; padding-top:10px;">Stock Actuel</h3>
                    <div id="pList"></div>
                </div>
                
                <div class="card" style="margin-top:20px;">
                    <h3>?? Dernières Commandes (Factures)</h3>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <thead style="background:#eee; text-align:left;"><tr><th>Date</th><th>Client</th><th>Produit</th><th>Total</th><th>Action</th></tr></thead>
                        <tbody id="sList"></tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <h3>?? Messages Clients</h3>
                <div id="chatBox" class="chat-body" style="height:400px;"></div>
                <input id="chatInput" placeholder="Répondre...">
                <button class="btn-main" onclick="sendMsg('admin')">Envoyer</button>
            </div>
        </div>
    </div>
    
    <script>
        function sync(){
            fetch('/api/sync').then(r=>r.json()).then(db => {
                document.getElementById('shopNameInput').value = db.config.name;
                
                // STATS & IA
                let total = 0; 
                db.sales.forEach(s => total += parseInt(s.price));
                document.getElementById('nbSales').innerText = db.sales.length;
                document.getElementById('ca').innerText = total.toLocaleString();
                
                let ia = "Analyse...";
                if(db.sales.length > 5) ia = "?? Tendance: Forte demande ! Augmentez les prix de 5%.";
                else ia = "?? Tendance: Calme. Faites une promotion sur le High-Tech.";
                document.getElementById('aibox').innerText = "?? Conseil IA : " + ia;

                // PRODUITS
                let ph = "";
                db.products.forEach(p => {
                    ph += "<div style='display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:10px 0;'><span><b>"+p.name+"</b> ("+p.cat+") - "+p.price+" MGA</span> <button style='background:none; border:none; color:red; cursor:pointer;' onclick='del("+p.id+")'>?</button></div>";
                });
                document.getElementById('pList').innerHTML = ph;

                // VENTES
                let sh = "";
                db.sales.forEach(s => {
                    sh += "<tr><td>"+s.date+"</td><td>"+s.user+"</td><td>"+s.product+"</td><td>"+s.price+"</td><td><button onclick='printInv("+JSON.stringify(s)+")'>?? Reçu</button></td></tr>";
                });
                document.getElementById('sList').innerHTML = sh;

                // CHAT
                let ch = "";
                db.messages.forEach(m => {
                    let cls = (m.u === 'admin') ? 'me' : 'other';
                    ch += "<div class='msg "+cls+"'><b>"+m.u+":</b> "+m.msg+"</div>";
                });
                let box = document.getElementById('chatBox');
                box.innerHTML = ch;
                box.scrollTop = box.scrollHeight;
            });
        }
        
        function addP(){
            let n = document.getElementById('pn').value;
            let p = document.getElementById('pp').value;
            let c = document.getElementById('pc').value;
            if(n && p) post({type:'add_prod', data:{name:n, price:p, cat:c}});
        }
        function del(id){ post({type:'del_prod', id:id}); }
        function upName(){ post({type:'config', data:{name:document.getElementById('shopNameInput').value}}); }
        function sendMsg(u){ 
            let t = document.getElementById('chatInput').value;
            if(t) { post({type:'msg', data:{u:u, msg:t}}); document.getElementById('chatInput').value=''; }
        }
        function post(d){ fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(sync); }
        function logout(){ localStorage.clear(); location.href='/login'; }
        function printInv(s){
            var w = window.open('','','width=600,height=600');
            w.document.write("<html><body style='font-family:Arial; padding:40px; border:2px solid #333;'><h1>REÇU DE COMMANDE</h1><hr><p><b>ID:</b> "+s.id+"</p><p><b>Client:</b> "+s.user+"</p><p><b>Adresse:</b> "+s.address+"</p><h2>Article: "+s.product+"</h2><h1>Total: "+s.price+" MGA</h1><p>Date: "+s.date+"</p><button onclick='window.print()'>Imprimer</button></body></html>");
        }
        
        sync(); setInterval(sync, 4000);
    </script></body></html>`);
});

// ROUTE CLIENT
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div class="navbar">
        <div class="nav-logo" id="shopLogo">flashdeal<span>Clone</span></div>
        <div class="search-container">
            <select id="catFilter" style="width:auto; border-radius:4px 0 0 4px; background:#f3f3f3; color:black; border:none; padding:0 10px; cursor:pointer;">
                <option value="">Toutes nos catégories</option>
                <option>High-Tech</option><option>Mode</option><option>Maison</option>
            </select>
            <input class="search-input" id="searchBar" placeholder="Rechercher..." onkeyup="render()">
            <button class="search-btn">??</button>
        </div>
        <div class="nav-tools">
            <div>Bonjour, <b id="uName">Client</b></div>
            <button class="nav-btn" onclick="sync()">??</button>
            <button class="nav-btn logout-btn" onclick="logout()">Déconnexion</button>
        </div>
    </div>
    
    <div class="container">
        <div class="grid" id="grid"></div>
    </div>

    <button onclick="toggleChat()" style="position:fixed; bottom:20px; right:20px; background:#febd69; border:1px solid #a88734; padding:15px; border-radius:50%; font-size:20px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.3);">??</button>
    <div id="chatWidget" class="chat-widget">
        <div class="chat-header" onclick="toggleChat()">Service Client <span>_</span></div>
        <div id="clientChatBox" class="chat-body"></div>
        <div style="padding:10px; border-top:1px solid #ddd;">
            <input id="clientMsg" placeholder="Votre message..." style="margin:0;">
            <button class="btn-main" style="margin-top:5px;" onclick="sendClientMsg()">Envoyer</button>
        </div>
    </div>

    <script>
        var products = [];
        var user = JSON.parse(localStorage.getItem('user'));
        if(!user) location.href='/login';

        function sync(){
            fetch('/api/sync').then(r=>r.json()).then(db => {
                document.getElementById('shopLogo').innerHTML = db.config.name + "<span>.fr</span>";
                document.getElementById('uName').innerText = user.u;
                products = db.products;
                render();
                
                // Chat Sync
                let ch = "";
                db.messages.forEach(m => {
                    let cls = (m.u === user.u) ? 'me' : 'other';
                    ch += "<div class='msg "+cls+"'><b>"+m.u+":</b> "+m.msg+"</div>";
                });
                let box = document.getElementById('clientChatBox');
                box.innerHTML = ch;
                if(document.getElementById('chatWidget').style.display === 'block') box.scrollTop = box.scrollHeight;
            });
        }

        function render(){
            var cat = document.getElementById('catFilter').value;
            var search = document.getElementById('searchBar').value.toLowerCase();
            
            var html = "";
            var filtered = products.filter(p => {
                return (cat === "" || p.cat === cat) && p.name.toLowerCase().includes(search);
            });

            if(filtered.length === 0) html = "<p style='padding:20px'>Aucun résultat trouvé.</p>";

            filtered.forEach(p => {
                html += "<div class='card'>";
                html += "<div><span class='badge'>"+p.cat+"</span><h3>"+p.name+"</h3></div>";
                html += "<div><div class='price'>"+p.price+" MGA</div><div style='color:#007600; font-size:12px; margin-bottom:10px;'>En stock.</div>";
                html += "<button class='btn-main' onclick='buy(\\""+p.name+"\\", \\""+p.price+"\\", \\""+p.cat+"\\")'>Ajouter au panier</button></div>";
                html += "</div>";
            });
            document.getElementById('grid').innerHTML = html;
        }

        function buy(n, p, c){
            var addr = prompt("Adresse de livraison pour "+n+" ?");
            if(addr){
                fetch('/api/action', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        type: 'buy',
                        data: {product:n, price:p, cat:c, address:addr, user:user.u}
                    })
                }).then(() => alert("Commande validée !"));
            }
        }

        function toggleChat(){
            var w = document.getElementById('chatWidget');
            w.style.display = (w.style.display === 'none' || w.style.display === '') ? 'block' : 'none';
        }

        function sendClientMsg(){
            var t = document.getElementById('clientMsg').value;
            if(t) {
                fetch('/api/action', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({type: 'msg', data: {u:user.u, msg:t}})
                }).then(sync);
                document.getElementById('clientMsg').value = '';
            }
        }

        function logout(){ localStorage.clear(); location.href='/login'; }

        sync(); setInterval(sync, 4000);
    </script></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("SERVEUR NODE V6 PRET SUR LE PORT " + PORT);
});
        
