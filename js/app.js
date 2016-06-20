// Bootstrap Sidebar Toggle
$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

// Change text of toggle button
// http://jsfiddle.net/dFZyv/
$(".pushme").click(function() {
    $(this).text(function(i, v) {
        return v === 'Show Sidebar' ? 'Hide Sidebar' : 'Show Sidebar';
    });
});

var map;

function toggleBounce() {
    if (this.marker.getAnimation() !== null) {
        this.marker.setAnimation(null);
    } else {
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}

// Add name to function for easier debugging
var VenueObject = function VenueObject(venue) {
    var self = this;
    this.name = venue.name;
    this.lat = venue.location.lat;
    this.lng = venue.location.lng;
    this.foodType = venue.categories[0].name;
    this.address = venue.location.formattedAddress.join(", ");
    this.phone;
    if (venue.contact.formattedPhone === undefined) {
        self.phone = "<i>Phone Not Provided</i>";
    } else {
        self.phone = venue.contact.formattedPhone;
    }
    this.venueURL = venue.url;
    this.venueRating = venue.rating;
    this.visible = ko.observable(true);

    // Create the map marker for this restaurant object 
    this.marker = new google.maps.Marker({
        position: new google.maps.LatLng(self.lat, self.lng),
        map: map,
        title: self.name,
        animation: google.maps.Animation.DROP
    });

    // Show the map marker for this restaurant object
    // Subscribe to changes to a observable "newValue"
    this.visible.subscribe(function(newValue) {
        this.marker.setMap(newValue === true ? map : null);
    }, this);

    // Create the info window for this restaurant object 
    this.infoWindow = new google.maps.InfoWindow({
        content: '<div class="info-window-content"><div class="title"><b>' + self.name + "</b></div>" +
            '<div class="content"><a href="' + self.venueURL + '">' + self.venueURL + "</a></div>" +
            '<div class="content">Cuisine Type: ' + self.foodType + "</div>" +
            '<div class="content">' + self.address + "</div>" +
            '<div class="content">' + self.phone + "</div>" +
            '<div class="content">Foursquare Rating: ' + self.venueRating + "</div></div>"
    });
};

// API call to Foursquare to retreive venue data
// Error Handling: http://stackoverflow.com/questions/1740218/error-handling-in-getjson-calls
var get4Square = function(callback) {
    $.getJSON("https://api.foursquare.com/v2/venues/explore?ll=40.742641,-73.982462&limit=25&section=food&oauth_token=CC2VGZMOFO0FXFN1V2A0AWLXEWZQDK1153NMCI4XHBS10HIC&v=20160508", callback, function(data) {})
        .done(function() {
            console.log('getJSON request succeeded!');
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert('getJSON request failed! ' + textStatus);
        })
        .always(function() {
            console.log('getJSON request ended!');
        });
};

// Function to limit binding field length in sidebar
//http://jsfiddle.net/dima_k/bZEQM/1/
ko.bindingHandlers.truncatedText = {
    update: function(element, valueAccessor, allBindingsAccessor) {
        var originalText = ko.utils.unwrapObservable(valueAccessor()),
            // 10 is a default maximum length
            length = ko.utils.unwrapObservable(allBindingsAccessor().maxTextLength) || 20,
            truncatedText = originalText.length > length ? originalText.substring(0, length) + "..." : originalText;
        // updating text binding handler to show truncatedText
        ko.bindingHandlers.text.update(element, function() {
            return truncatedText;
        });
    }
};

// The ViewModel represents the data and operations on a UI
function AppViewModel() {
    var self = this;
    self.searchTerm = ko.observable("");
    self.locationList = ko.observableArray([]);
    self.locationList.subscribe(function(newItems) {
        newItems.forEach(function(newVenue) {
            // Sets the click callback for the map marker 
            newVenue.marker.addListener('click', function() {
                self.locationList().forEach(function(item) {
                    item.infoWindow.close();
                });
                // Show info window
                newVenue.infoWindow.open(map, this);
                newVenue.marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(function() {
                    newVenue.marker.setAnimation(null);
                }, 2000);
            });
        });
    });

    // Creates the list of visible sidebar items
    self.filteredList = ko.computed(function() {
        var filter = self.searchTerm().toLowerCase();
        var locationList = self.locationList();
        if (!filter) { // i.e. no search term
            locationList.forEach(function(locationItem) {
                locationItem.visible(true);
            });
            return locationList;
        } else { // i.e. there is a search term
            return locationList.filter(function(locationItem) {
                var result = locationItem.name.toLowerCase().search(filter) > -1;
                locationItem.visible(result);
                return result;
            });
        }
    }, self);

    // Close all infoWindows and open only the one clicked
    // https://developers.google.com/maps/documentation/javascript/examples/marker-animations
    this.showVenue = function(venue) {
        self.locationList().forEach(function(item) {
            item.infoWindow.close();
        });
        google.maps.event.trigger(venue.marker, 'click');
        venue.marker.addListener('click', toggleBounce);

        function toggleBounce() {
            if (venue.marker.getAnimation() !== null) {
                venue.marker.setAnimation(null);
            } else {
                venue.marker.setAnimation(google.maps.Animation.BOUNCE);
            }
        }
    };

    // Load locations from Foursqaure and create VenueObjects from the data
    get4Square(function(data) {
        var venues = data.response.groups[0].items.map(function(fsVenue) {
            return new VenueObject(fsVenue.venue);
        });
        self.locationList(venues);
        //console.log(self.locationList()[24].phone);
    });

    // Callback that initializes the Google Map object 
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 19,
        center: {
            lat: 40.742080,
            lng: -73.982692
        }
    });

    $('.map').css({
        height: window.innerHeight - 50
    });
}

// Activate Knockout once the map is initialized
function startApp() {
    ko.applyBindings(new AppViewModel());
}

// Error alert if there is an issue loading Google Maps API
function errorHandling() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}