// Import stylesheets
import "./style.css";

// Firebase App (the core Firebase SDK) is always required
// and must be listed first
import * as firebase from "firebase/app";
import * as firebaseui from "firebaseui";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";  // Cloud Firestore
import "firebase/database";   // real-time database
import "firebase/storage";

// Document elements
const card = $(".card");
const table = $("#table");
const board = $("#b2");
const loginUserButton = document.getElementById('loginUser');

// Global variables
var selected = null;
var selectedlast = null;
var topz = 1;
const VAL = new Array("A","2","3","4","5","6", "7", "8", "9", "10", "J", "Q", "K", "J");
var cardsID = [];
var cardsOrder = [];
var rejects = [];
var CHAIR = 0;     // position as value from 0 to 1 where player position / total number of players

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyCOWNTKuXBnsexSrXsgrDqFas7fh4M26C8",
  authDomain: "jeu-cartes-firebase.firebaseapp.com",
  databaseURL: "https://jeu-cartes-firebase.firebaseio.com",
  projectId: "jeu-cartes-firebase",
  storageBucket: "jeu-cartes-firebase.appspot.com",
  messagingSenderId: "1061076344801",
  appId: "1:1061076344801:web:3161788f02338ea36a7ca0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Get a reference to the database service
var database = firebase.database();
// Create a reference with an initial file path and name
var storage = firebase.storage();

// FirebaseUI config
const uiConfig = {
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  signInOptions: [
    // Email / Password Provider.
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl){
      // Handle sign-in.
      // Return false to avoid redirect.
      return false;
    }
  }
};

// Initialize the FIrebaseUI Widget using Firebase
const ui = new firebaseui.auth.AuthUI(firebase.auth());

// Called when the user clicks the RSVP button
loginUserButton.addEventListener("click",
 () => {
    if (firebase.auth().currentUser) {
      // User is signed in; allows user to sign out
      firebase.auth().signOut();
    } else {
      // No user is signed in; allows user to sign in
      ui.start("#firebaseui-auth-container", uiConfig);
    }
});

// Listen to the current Auth state
firebase.auth().onAuthStateChanged((user)=> {
  if (user) {
    loginUserButton.textContent = "Logout";
    document.getElementById("loggedInUser").innerHTML = "" + firebase.auth().currentUser.displayName + "";
    intiateCardsUpdateFromDB();
  //  userId: firebase.auth().currentUser.uid
  }
  else {
    loginUserButton.textContent = "Login"
    document.getElementById("loggedInUser").innerHTML = "...";
  }
});


/**
 *  MAIN 
 * 
 * 
 */
$(document).ready(function() {

  // firebase.database().ref().child('/cardpos/10C/facedown/').update(true);
  // debugger;


  // setup table and generate card deck  
  prepTableMemoryGame();
  genDeck();
  drawCardsOnce();
  addListenersToCards();

  // Card image test (testing firebase storage functionality)
  // setCardImage("Playing_card_club_A.svg","cardimage");

  var touchstartx = 0;
  var touchstarty = 0;

  }

  // add functions to each button 
  document.getElementById("shuffle").addEventListener("click", testShuffle);
  document.getElementById("showcards").addEventListener("click", showCards);
  document.getElementById("showcardsdeck").addEventListener("click", showCardsDeck);
  document.getElementById("showcardscircle").addEventListener("click", showCardsCircle);
  document.getElementById("showcardsstacked").addEventListener("click", showCardsStacked);
  document.getElementById("flipup").addEventListener("click", flipAllUp);
  document.getElementById("flipdown").addEventListener("click", flipAllDown);
  document.getElementById("tabHeaderLobby").addEventListener("click", gotoLobby);
  document.getElementById("tabHeaderTable").addEventListener("click", gotoTable);
  
  document.getElementById("order").addEventListener("click", function(e) {
    cardsOrder.sort(function(a, b) {
      return a - b;
    });
  });


});


/**
 * 
 */
function addListenersToCards(){
  // add touh events to each card to allow move or flip
  var elem = document.getElementsByClassName("card");
  for (var i = 0; i < elem.length; i++) {
    elem[i].addEventListener("touchmove", function(e) {
      selectCard(e, this);
    });
    //    elem[i].addEventListener("mouseup", function(e) {unselectCard(e, this)});
    elem[i].addEventListener("click", function(e) {
      flipCard(e, this);
    });
    elem[i].addEventListener("touchstart", function(e) {
      touchstartx = parseInt(e.changedTouches[0].clientX); // get x coord of touch point
      touchstarty = parseInt(e.changedTouches[0].clientY); // get y coord of touch point
      e.preventDefault() // prevent default click behavior
    });
    //    elem[i].addEventListener("mousedown mousemove", function(e) {selectCard(e, this)});
    elem[i].addEventListener("touchend", function(e) {
      e.preventDefault() // prevent default click behavior
      var touchendx =  parseInt(e.changedTouches[0].clientX);
      var touchendy =  parseInt(e.changedTouches[0].clientY);
      if ( Math.abs(touchendx-touchstartx) < 10 && Math.abs(touchendy-touchstarty) < 10) {
        flipCard(e, this);
      } else {
        unselectCard(e, this);
      }
    });
}
/**
 * 
 */
function gotoLobby(event) {
  var x = document.getElementsByClassName("containerTab");
  for (var i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  document.getElementById("tabLobby").style.display = "block";
}

/**
 * 
 */
function gotoTable(event) {
  var x = document.getElementsByClassName("containerTab");
  for (var i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  document.getElementById("tabTable").style.display = "block";
  drawCardsOnce() ;
  // addListenersToCards();


}


function intiateCardsUpdateFromDB() {
  // listner (".on") realtime database changes and update card positions
  // this allows for another user to change card positions and updates will be reflected in another client session
  database.ref("game123/cardpos/").on("value", function(snapshot) {
    snapshot.forEach(function(data) {
      var elem = $("#" + data.key);
      var o = data.val();
      var pxy = convertArToXy(o.angle, o.r);
      // console.log("pxy: %i, %i", pxy.posx, pxy.posy );
      elem.animate({ "left": pxy.posx + "px", 
                      "top": pxy.posy + "px" });
      elem.css({ "z-index":  o.posz });

      if (o.facedown) {
        elem.addClass("highlight");
      } else {
        elem.removeClass("highlight");
      }
    });
    updateTable();
  });
}

/**
 * 
 */
function drawCardsOnce() {

  database.ref("game123/cardpos/").once("value", function(snapshot) {
    snapshot.forEach(function(data) {
      var elem = $("#" + data.key);
      var o = data.val();

      var pxy = convertArToXy(o.angle, o.r);
      elem.animate({ "left": pxy.posx + "px", 
                      "top": pxy.posy + "px" });
      elem.css({ "z-index":  o.posz });

      if (o.facedown) {
        elem.addClass("highlight");
      } else {
        elem.removeClass("highlight");
      }
    });
    updateTable();
  });
}



/**
 * Select card 
 */
function selectCard(e, t) {
  debugger;
  var posx = parseInt( e.touches[0].clientX - table.position().left - board.position().left - parseInt($(".card").css("width"))*4/3) + "px";
  var posy = parseInt( e.touches[0].clientY - table.position().top  - board.position().top  - parseInt($(".card").css("height"))*4/3) + "px";
  var posz = $(t).css("z-index");
   $(t).css({ left: posx, top: posy });

  if (selected != selectedlast) {
    $(t).css({ "z-index": posz++ });
  }
  selected = $(t);
  selectedlast = selected;
  
  // $("#info").text( "INFO: selected " + $(t).text() + " @ (" + posx + ", " + posy + ", " + posz + ")" );

}

function unselectCard(e, t) {
  e.preventDefault();
  // $("#info").text("INFO:");
  selected = null;

  var posx = parseInt($(t).position().left);
  var posy = parseInt($(t).position().top);
  
  var posAr = convertXyToAr(posx, posy);
    //  "angle" : posAr.angle,
    //  "r" : posAr.r

  // console.log( "%i %i %s", $(t).position().left, $(t).position().top, $(t).css("z-index"));
  database.ref("game123/cardpos/" + t.id).set( {
     "posx" : posx, 
     "posy" : posy, 
     "posz" : parseInt($(t).css("z-index")), 
     "facedown":$(t).hasClass("highlight") ,
     "angle" : posAr.angle,
     "r" : posAr.r
     });
}

function prepTableMemoryGame() {
  for (var j = 0; j < 4; j++) {
    var newreject = $("<div></div>").text("0 for player " + parseInt(j + 1));
    rejects.push("#reject" + j);
    newreject.attr("id", "reject" + j);
    newreject.addClass("reject");
    switch (j) {
      case 0:
        newreject.css({ left: "40%", bottom: "5px" });
      break;
      case 1:
        newreject.css({ left: "5px", top: "45%" });
      break;
      case 2:
        newreject.css({ left: "40%", top: "5px" });
      break;
      case 3:
        newreject.css({ right: "5px", top: "45%" });
      break;
    }
    table.append(newreject);
  }
}

function updateTable() {
  for (var i = 0; i < rejects.length; i++) {
    var count = 0;
    for (var j = 0; j < cardsID.length; j++) {
      if (checkInside("#" + cardsID[cardsOrder[j]], rejects[i])) {
        count++;
      }
    }
    $(rejects[i]).text(count + " for player " + parseInt(i + 1));
  }
}

function checkInside(item, region) {
  // console.log("%s %s", item, region);
  // console.log("%s", $(item).text() );

  var r_top = $(region).position().top;
  var r_left = $(region).position().left;
  var r_right = r_left + $(region).outerWidth();
  var r_bottom = r_top + $(region).outerHeight();

  var item_x = $(item).position().left + $(item).outerWidth() / 2;
  var item_y = $(item).position().top + $(item).outerHeight() / 2;

  var inside = false;
  if (
    item_x >= r_left &&
    item_x <= r_right &&
    item_y > r_top &&
    item_y < r_bottom
  ) {
    inside = true;
  }

  //  console.log("%s %i %i %i %i  %s %i %i  %s", region, r_left, r_right, r_top,  r_bottom, item, item_x, item_y, inside.toString());

  return inside;
}


function flipCard(e, t) {
  // console.log("in flipCard");
  // e.preventDefault();

  var cc = database.ref("game123/cardpos/" + t.id );
  cc.once("value")
    .then(function(snapshot) {
     if (snapshot.child("facedown").val()) {
      database.ref("game123/cardpos/" + t.id).update({ facedown: false });
    } else {
      database.ref("game123/cardpos/" + t.id).update({ facedown: true });
    }
  });
 }


/* https://en.wikipedia.org/wiki/Playing_cards_in_Unicode */
function genDeck() {

  var cardsPosDataObjects = {};
  var c = 0;

  for (var j = 1; j <= 13; j++) {
  
    // Diamond
    var newcard = document.createElement("DIV");
    deck.appendChild(newcard);     
    newcard.innerHTML = VAL[j - 1] + "<br>\u2666";
    newcard.classList.add("card", "redcard");
    newcard.id = j + "D";
    cardsID.push(newcard.id);
    cardsOrder.push(c++);

    // Hearts
    var newcard = document.createElement("DIV");
    deck.appendChild(newcard);     
    newcard.innerHTML = VAL[j - 1] + "<br>\u2665";
    newcard.classList.add("card", "redcard");
    newcard.id = j + "H";
    cardsID.push(newcard.id);
    cardsOrder.push(c++);

    // Spades
    var newcard = document.createElement("DIV");
    deck.appendChild(newcard);     
    newcard.innerHTML = VAL[j - 1] + "<br>\u2660";
    newcard.classList.add("card", "blackcard");
    newcard.id = j + "S";
    cardsID.push(newcard.id);
    cardsOrder.push(c++);
  
    // clubs
    var newcard = document.createElement("DIV");
    deck.appendChild(newcard);     
    newcard.innerHTML = VAL[j - 1] + "<br>\u2663";
    newcard.classList.add("card", "blackcard");
    newcard.id = j + "C";
    cardsID.push(newcard.id);
    cardsOrder.push(c++);
  }
}


/**
 * Generates a random number between A and B
 *
 * @param {integer} A start number
 * @param {integer} B end number
 * @return {integer} a number between A & B inclusively
 * @customfunction
 */
function randomNb(a, b) {
  var min = Math.ceil(a);
  var max = Math.floor(b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function testShuffle() {
  var list = cardsOrder;
  var ln = list.length;

  // $("#info").text(list.toString());

  for (var j = 0; j < 100; j++) {
    var n = randomNb(0, ln - 1);
    var section = list.pop();
    list.splice(n, 0, section);
    // console.log("n: %i, (%s)  list: %s ", n, section, list.toString());
    // $("#info").text(list.toString());
  }

  cardsOrder = list;
}

/**
 * Layout position of cards on the table
 */
function showCards() {
  var topPos = 180;
  var leftPos = 240;
  var maxRow = 12;
  var numRow = 1;
  var topz = 1;
  
  var cardsPosDataObjects = {};
 
  // cardsPosData.length = 0;  // clear array

  for (var j = 0; j < cardsOrder.length; j++) {
   var elem = $("#" + cardsID[cardsOrder[j]]);
  var px = parseInt(leftPos);
  var py = parseInt(topPos);
  var par = convertXyToAr(px,py);
   cardsPosDataObjects[cardsID[cardsOrder[j]]] = {
                        "posx": px, 
                        "posy": py,
                        "posz":topz++,
                        "facedown":elem.hasClass("highlight"),
                        "angle" : par.angle, "r" : par.r } ;
                          // do not change "face-down"

    leftPos += elem.outerWidth() + 10;
    
    if (numRow++ >= maxRow) {
      numRow = 1;
      topPos += elem.outerHeight() + 10;
      leftPos = 240;
    }


  }
  //  console.log( JSON.stringify(cardsPosDataObjects) ); debugger;
  database.ref("game123/cardpos/").set(cardsPosDataObjects);

  // should not be needed:  updateCardsDisplayOnTable();
}

function showCardsStacked() {

  var sp = 35;
  var leftpos = 250;
  var toppos = 100;

  var cardsPosDataObjects = {};

  for (var j=1 ; j<=13; j++){

    var px = parseInt(leftpos + (j * sp) / 2),
    var py = parseInt(toppos + j * sp),
    var par = convertXyToAr(px,py);
     cardsPosDataObjects[j + "D"]={
        posx : px,   posy:  py,
        posz:  topz++, facedown:false,
        angle: par.angle,  r: par.r 
      };

    var px = parseInt(leftpos + (j * sp) / 2 + sp*2),
    var py =  parseInt(toppos + j * sp),
    var par = convertXyToAr(px,py);
    cardsPosDataObjects[j + "H"]={
        posx : px,   posy:  py,
        posz:  topz++, facedown:false,
        angle: par.angle,  r: par.r 
      };

    var px = parseInt(leftpos + (j * sp) / 2 + sp*4),
    var py =  parseInt(toppos + j * sp),
    var par = convertXyToAr(px,py);
    cardsPosDataObjects[j + "S"]={
        posx : px,   posy:  py,
        posz:  topz++, facedown:false,
        angle: par.angle,  r: par.r 
      };

    var px = parseInt(leftpos + (j * sp) / 2 + sp*6),
    var py =  parseInt(toppos + j * sp),
    var par = convertXyToAr(px,py);
    cardsPosDataObjects[j + "C"]={
        posx : px,   posy:  py,
        posz:  topz++, facedown:false,
        angle: par.angle,  r: par.r 
      };

  }
  database.ref("game123/cardpos/").update(cardsPosDataObjects) ;

}


/**
 * Layout position of cards on the table
 */
function showCardsDeck() {
  var posCx = $("#table").outerWidth()/2 - parseInt($(".card").css("width"))/2 ;
  var posCy = $("#table").outerHeight()/2 - parseInt($(".card").css("height"))/2 ;
 
  var posR = 1;
  var posDeg = 10;
  var topz = 1;
  
  var cardsPosDataObjects = {};
 
  // cardsPosData.length = 0;  // clear array

  for (var j = 0; j < cardsOrder.length; j++) {
    var leftPos = parseInt(posCx) + parseInt(posR*Math.sin(j/52*Math.PI*2));
    var topPos = parseInt(posCy) + parseInt(posR*Math.cos(j/52*Math.PI*2));
    var par = convertXyToAr(leftPos,topPos);

    var elem = $("#" + cardsID[cardsOrder[j]]);
    cardsPosDataObjects[cardsID[cardsOrder[j]]] = {
                        "posx": leftPos, 
                        "posy": topPos,
                        "posz": topz++,
                        "facedown":elem.hasClass("highlight"),
                        "angle" : par.angle, "r" : par.r } ;
                          // do not change "face-down"

  }
  // console.log( JSON.stringify(cardsPosDataObjects) ); debugger;
  database.ref("game123/cardpos/").set(cardsPosDataObjects);

  // should not be needed:  updateCardsDisplayOnTable();
}


/**
 * Layout position of cards on the table
 */
function showCardsCircle() {
  var posCx = $("#table").outerWidth()/2 - parseInt($(".card").css("width"))/2 ;
  var posCy = $("#table").outerHeight()/2 - parseInt($(".card").css("height"))/2 ;
 
  var posR = 200;
  var posDeg = 10;

  var topPos = 120;
  var leftPos = 30;
  var maxRow = 13;
  var numRow = 1;
  var topz = 1;
  
  var cardsPosDataObjects = {};
 
  // cardsPosData.length = 0;  // clear array

  for (var j = 0; j < cardsOrder.length; j++) {
    leftPos = parseInt(posCx) + parseInt(posR*Math.sin(j/52*Math.PI*2));
    topPos = parseInt(posCy) + parseInt(posR*Math.cos(j/52*Math.PI*2));
    var par = convertXyToAr(leftPos,topPos);

    var elem = $("#" + cardsID[cardsOrder[j]]);
    cardsPosDataObjects[cardsID[cardsOrder[j]]] = {
                        "posx": leftPos, 
                        "posy": topPos,
                        "posz": topz++,
                        "facedown":elem.hasClass("highlight"),
                        "angle" : par.angle, "r" : par.r } ;
  }
  //console.log( JSON.stringify(cardsPosDataObjects) ); debugger;
  database.ref("game123/cardpos/").set(cardsPosDataObjects);

  // should not be needed:  updateCardsDisplayOnTable();
}



function flipAllDown() {
  // This does not work... removes posx, posy, posz info
  // var updates = {};  
  // for (var j = 0; j < cardsID.length; j++) {
  //     updates[cardsID[cardsOrder[j]]]={ facedown: true};
  // }
  // database.ref("game123/cardpos/").update(updates);

  // Too slow
  // for (var j = 0; j < cardsID.length; j++) {
  //   database.ref("game123/cardpos/" + cardsID[cardsOrder[j]]).update({ facedown: true });
  // }
  var updates = {};   
  database.ref("game123/cardpos/").once("value", function(snapshot) {
      snapshot.forEach(function(data) {
        var o = data.val();
        updates[data.key]={ posx : o.posx, posy : o.posy, posz: o.posz, facedown: true, angle : o.angle, r : o.r};
      });
  });
 database.ref("game123/cardpos/").update(updates);
}

function flipAllUp() {
  var updates = {};   
  database.ref("game123/cardpos/").once("value", function(snapshot) {
      snapshot.forEach(function(data) {
        var o = data.val();
        updates[data.key]={ posx : o.posx, posy : o.posy, posz: o.posz, facedown: false, angle : o.angle, r : o.r};
      });
  });
  
 database.ref("game123/cardpos/").update(updates);
}

/**
 * Update the graphical display of the cards on the prepTable
 * In this function, the data is read ONCE from the realtime database
 * 
 */
function updateCardsDisplayOnTable() {

  database.ref("game123/cardpos/").once("value", function(snapshot) {
      snapshot.forEach(function(data) {
        var elem = $("#" + data.key);

        var o = data.val();
        var pxy = convertArToXy(o.angle, o.r);
        elem.animate({ "left": pxy.posx + "px", 
                        "top": pxy.posy + "px" });
        elem.css({ "z-index":  o.posz });

        if (o.facedown) {
          elem.addClass("highlight");
        } else {
          elem.removeClass("highlight");
        }
      });
  });

}

/**
 * Convert an angle + radius value from an xy position 
 * 
 * @param {integer} posx height position in px
 * @param {integer} posy with position in px
 * @return {object} {deg: angle in radian, r: radius in pixels} 
 */
function convertXyToAr(posx, posy) {
    var posCx = $("#table").outerWidth()/2;
    var posCy = $("#table").outerHeight()/2;

    var dx = posx - posCx;
    var dy = posy - posCy;
    return { angle: Math.atan2(dy, dx) - CHAIR*2*Math.PI, 
             r:   Math.round ( Math.sqrt( dx*dx + dy*dy) ) }
}

/**
 * Convert an xy position based on an angle + radius
 * 
 * @param {double} angle angle in radian
 * @param {integer} r lenght of radius in px
 * @return {object} {deg: angle in radian, r: radius in pixels} 
 */
function convertArToXy(angle, r) {
    var posCx = $("#table").outerWidth()/2;
    var posCy = $("#table").outerHeight()/2;

  return { posx: (r*Math.cos(angle - CHAIR*2*Math.PI) + posCx), 
            posy: (r*Math.sin(angle - CHAIR*2*Math.PI) + posCy) }
}



/*  --- TESTS WAYS OF ADDINT DATA TO A REALTIME DATABASE IN FIREBASE  ----
  // test writing data to realtime database
  database.ref("game123/deck/").set( {
                    card1 : {id:"6C",posx:10,posy:15},
                    card2 : {id:"7H",posx:12,posy:15}
                    });

  // test update one property
  database.ref("game123/deck/card1").update({posy:100});

  // test add a record using push
  database.ref("game123/deck/").push( {
                    card3 : {id:"9H",posx:50,posy:60}
  });

  // test list of objects
  var dataToImport = {};
  for (var i=0; i<5; i++) {
    dataToImport["card"+i] = {id:i, posx:i*2};
  }
  database.ref("game123/listofobjects/").set(dataToImport);

  // debugger;
// --- TESTS WAYS OF ADDINT DATA TO A REALTIME DATABASE IN FIREBASE  ----  */


/**
 * Set the image stored in the Firebase storage to an image getElementById
 * Process errors correctly 
 * 
 */
function setCardImage(imagename, elemID) {

  // Create a reference to the file we want to download
  var storageRef = storage.ref();
  var cardsRef = storageRef.child('cards');
  var imageRef = cardsRef.child(imagename);
  
 // Get the download URL
  imageRef.getDownloadURL().then(function(url) {
    var img = document.getElementById(elemID);
    img.src = url;
  }).catch(function(error) {
    // A full list of error codes is available at
    // https://firebase.google.com/docs/storage/web/handle-errors
    switch (error.code) {
      case 'storage/object-not-found':
        console.log("File doesn't exist");
        break;
      case 'storage/unauthorized':
        console.log("User doesn't have permission to access the object");
        break;
      case 'storage/canceled':
        console.log("User canceled the upload");
        break;
      case 'storage/unknown':
        console.log("Unknown error occurred, inspect the server response");
        break;
    }
  });
}
