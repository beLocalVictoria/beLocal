'use strict';

/**
 * @ngdoc function
 * @name clientApp.controller:SellerCtrl
 * @description
 * # SellerCtrl
 * Controller of the clientApp
 */
angular.module('clientApp')
  .controller('SellerCtrl', function ($scope, StateService, $timeout, $q, $rootScope) {
    $scope.StateService = StateService;
    $scope.opened = false;
    $scope.minDate = new Date();
    $scope.sellerLocations = [];
    $scope.emailAtLocation = StateService.getCurrentUser().email;
    $scope.warningHTML = '';
    $scope.locationResults = {};
    $scope.locationType = 'true';
    $scope.currentUser = StateService.getCurrentUser();
    $scope.facebookChecked = false;
    $scope.twitterChecked = false;
    $scope.sellingToday = false;
    $scope.currentUser = {};
    angular.copy(StateService.getCurrentUser(), $scope.currentUser);
    $scope.isCreatingCustomLocation = false;
    $scope.showInactiveAlert = true;
    $scope.profileImage = '';
    $scope.profileImageCoords = [];
    $scope.showXSNav = true;
    $scope.profileImageError='';

    var geocoder = new google.maps.Geocoder();

    $scope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };    

    StateService.retrieveUpdatedCurrentUser().then(function(response){
        StateService.setProfileVendor(response.data);
        $scope.isCurrentUserActive = response.data.is_active;
    });

    StateService.getAvailableMarkets().then(function() {
        if(StateService.getAvailableMarketList().length > 0)
            $scope.newLocationMarket = StateService.getAvailableMarketList()[0].id;
    });

    $scope.isTwitterAuth = OAuth.create('twitter');
    $scope.hashtag = ' #beLocal';

    $scope.weekdays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
    ];
    
    StateService.getTags().then(function() {
      $scope.tagList = StateService.getTagList();
    });
    
    StateService.getCategories().then(function() {
      $scope.categoryList = StateService.getCategoryList();
    });

    $scope.hideInactiveAlert = function() {
        $scope.showInactiveAlert = false;
    }

    $scope.doCustomLocation = function() {
        $scope.isCreatingCustomLocation = true;
        if($scope.isEditingLocation)
            $scope.submitLocationButtonText = 'Save Changes';
        else
            $scope.submitLocationButtonText = "Add Location";
    }

    $scope.manuallyTriggerCustomLocation = function() {
        $scope.doCustomLocation();
        $timeout(function() {
            angular.element('#customLocationTab').trigger('click');            
        });        
    }

    $scope.doMarketLocation = function() {
        $scope.isCreatingCustomLocation = false;
        $scope.submitLocationButtonText = "Join Market";
    }

    $scope.manuallyTriggerMarketLocation = function() {
        $scope.isCreatingCustomLocation = false;
        $scope.submitLocationButtonText = "Join Market";        
        $timeout(function() {
            angular.element('#marketLocationTab').trigger('click');            
        });        
    }

    $scope.doTwitterSignIn = function() {
        OAuth.popup('twitter', {cache : true})
        .done(function (twitter) {
            twitter.me().done(function(me) {
                var data = {'twitter_url' : 'http://www.twitter.com/' + me.alias};
                StateService.updateTwitterURL(data).then(function(result) {
                    StateService.setProfileVendor(result.data);
                })
            });
            $scope.safeApply(function() {
                $scope.isTwitterAuth = true;
                $scope.twitterChecked = true;
            });
        });
    }

    $scope.compareDates = function(date1, date2) {
        if(date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate())
            return true;
        else
            return false;
    }

    $scope.generateVendorURL = function(id) {
        var serverAddress = 'http://127.0.0.1:9000';
        return  serverAddress + '/vendor/details/1'; 
    }

    $scope.generateTwitterString = function() {
        var company_name = $scope.currentUser.vendor.company_name !== undefined ? $scope.currentUser.vendor.company_name : $scope.currentUser.name;        
        if($scope.sellingToday) {
            $scope.twitterString = company_name + " is open today. For a full list of selling locations and hours, visit " + $scope.generateVendorURL();
        } else {
            $scope.twitterString = "We're closed today, but make sure to check out our latest products and selling locations at " + $scope.generateVendorURL();
        }
    }

    $scope.generateFacebookString = function() {
        var company_name = $scope.currentUser.vendor.company_name !== undefined ? $scope.currentUser.vendor.company_name : $scope.currentUser.name;
        $scope.facebookString = company_name + ' is selling at the following locations today:\n';

        // GENERATE LOCATIONS
        for(var i = 0; i < $scope.sellerLocations.length; i++) {
            var sl = $scope.sellerLocations[i];
            // If we're a one time location, let's see if the date is today's date.
            if(sl.date !== null) {
                var slDate = new Date(sl.date);
                slDate.setTime(slDate.getTime() + slDate.getTimezoneOffset() * 60000);

                // If so, add it to the Facebook string.
                if($scope.compareDates(new Date(), slDate)) {
                    $scope.sellingToday = true;
                    $scope.facebookString += sl.name + ' at ' + sl.address.addr_line1 + ', ' + sl.address.city + '\nFrom ' + sl.address.hours[0].from_hour + ' - ' + sl.address.hours[0].to_hour + '\n';
                }
            } else {
                // We are a recurring location. Let's see if we're open today
                for(var j = 0; j < sl.address.hours.length; j++) {
                    var today = new Date().getDay() == 0 ? 6 : new Date().getDay();
                    if(sl.address.hours[j].weekday == today) {
                        $scope.sellingToday = true;
                        $scope.facebookString += sl.name + ' at ' + sl.address.addr_line1 + ', ' + sl.address.city + '\nFrom ' + sl.address.hours[j].from_hour + ' - ' + sl.address.hours[j].to_hour + '\n';                        
                    }
                }
            }
        }

        // GENERATE ITEMS  
        $scope.facebookString += '\nSome of the items we will be selling today include the following:\n';
        for(var i = 0; i < $scope.sellerItems.length; i++) {
            var si = $scope.sellerItems[i];
            if(si.stock === "IS")
                $scope.facebookString += si.name + '\n';
        }
    }

    $scope.editProfile = function() {
        var e = angular.element('#profile-image');
        e.wrap('<form>').closest('form').get(0).reset();
        e.unwrap();
    }

    $scope.generateSocialStrings = function() {
        $scope.generateFacebookString();
        $scope.generateTwitterString();
    }

    $scope.publishSocialUpdate = function() {
        if($scope.facebookChecked) {
      
            OAuth.popup('facebook', {cache : true, authorize: {'scope':'email, publish_actions'}})
            .done(function (facebook) {
                facebook.post({
                    url: '/me/feed',
                    data : {
                        message: $scope.facebookString
                    }
                });
            });
        } 

        if($scope.twitterChecked) {         
            OAuth.popup('twitter', {cache : true}).done(function(twitter) {
                twitter.post({
                    url: '/1.1/statuses/update.json' + '?status=' + escape($scope.twitterString + $scope.hashtag)
                });      
            });
        }
        angular.element('#shareModal').modal('hide');           
    }      

    $scope.vendorProfileUpdate = function() {
        $scope.vendorProfileUpdated = true;
        $scope.currentUser.vendor.address.addr_line1 = 'unknown';
        $scope.currentUser.vendor.address.zipcode = 'unknown';
        if($scope.profileForm.$valid) {
            angular.element('#profileModal').modal('hide');
            if($scope.currentUser.vendor.photo.id)
                $scope.currentUser.vendor.photo = $scope.currentUser.vendor.photo.id;
            StateService.updateCurrentUser($scope.currentUser).then(function(result) {
                StateService.setProfileVendor(result.data);
            });
        }
    }

    $scope.buildHoursObject = function() {
        var openHours = [];

        var start = new Date();
        var end = new Date();

        start.setHours(8);
        start.setMinutes(0,0);
        end.setHours(16);
        end.setMinutes(0,0);

        for(var i = 1; i < 8; i++) {
            openHours.push({
                weekday : i, 
                day : $scope.weekdays[i - 1], 
                from_hour : start, 
                to_hour: end,
                checked: i == 6 || i == 7 ? false : true
            });
        }

        return openHours;
    } 

    $scope.resetLocationModal = function() {
        $scope.manuallyTriggerMarketLocation();
        $scope.addressSearchText = undefined;
        $scope.newLocationSubmitted = false;
        $scope.isEditingLocation = false;

        var tempDate = new Date();
        tempDate.setHours(tempDate.getHours() + 1);
        $scope.startTime = $scope.roundTimeToNearestFive(new Date());
        $scope.endTime = $scope.roundTimeToNearestFive(tempDate);
        $scope.locationDate = new Date();
        $scope.locationHours = $scope.buildHoursObject();

        $scope.locationAddress = undefined;
        $scope.locationCity = undefined;
        $scope.locationProvince = undefined;
        $scope.locationCountry = undefined;
        $scope.locationPostalCode = undefined;
        $scope.locationName = undefined;
        $scope.emailAtLocation = StateService.getCurrentUser().email;
        $scope.phoneAtLocation = undefined;
        $scope.locationDescription = undefined;  
    }

    $scope.setTime = function(time) {
        var hour = parseInt(time.substr(0,2));
        var minute = parseInt(time.substr(3,2));
        var isPM = time.substr(5,2) === "PM"
        if (isPM) hour += 12;
        else if(!isPM && hour === 12) hour = 0;
        var date = new Date();
        date.setHours(hour);
        date.setMinutes(minute);

        return date;
    }

    $scope.editLocation = function(location) {
        $scope.manuallyTriggerCustomLocation();

        if(location.date == null) {
            var hours = $scope.buildHoursObject();
            var currentHour = 0;

            var start = new Date();
            var end = new Date();

            start.setHours(8);
            start.setMinutes(0,0);
            end.setHours(16);
            end.setMinutes(0,0);        

            for(var i = 0; i < hours.length; i++) {
                if(currentHour < location.address.hours.length && hours[i].weekday === location.address.hours[currentHour].weekday) {
                    hours[i].checked = true;
                    hours[i].day = $scope.weekdays[i];
                    hours[i].from_hour = $scope.setTime(location.address.hours[currentHour].from_hour);
                    hours[i].to_hour = $scope.setTime(location.address.hours[currentHour].to_hour);
                    currentHour += 1;                    
                } else {
                    hours[i].checked = false;
                    hours[i].from_hour = start;
                    hours[i].to_hour = end;
                }
            }
            $scope.locationDate = new Date(); // This shouldn't be necessary, but it is.
            $scope.locationHours = hours;  
            $scope.locationType = 'false';        
        } else {
            $scope.locationType = 'true';
            $scope.locationDate = location.date;

            $scope.startTime = $scope.setTime(location.address.hours[0].from_hour);
            $scope.endTime = $scope.setTime(location.address.hours[0].to_hour);
        }

        $scope.isEditingLocation = true;
        $scope.newLocationSubmitted = false;
        $scope.submitLocationButtonText = "Save Changes";

        $scope.addressSearchText = location.address.addr_line1 + ', ' + location.address.city + ', ' + location.address.state + ' ' + location.address.zipcode + ', ' + location.address.country;

        $scope.locationAddress = location.address.addr_line1;
        $scope.locationCity = location.address.city;
        $scope.locationProvince = location.address.state;
        $scope.locationCountry = location.address.country;
        $scope.locationName = location.name;
        $scope.locationPostalCode = location.address.zipcode;
        $scope.locationId = location.id;
        $scope.emailAtLocation = location.email;
        $scope.phoneAtLocation = location.phone;
        $scope.locationDescription  = location.description;
    }

    $scope.resetItemModal = function() {
        $scope.productImageError = undefined;       
        $scope.submitItemButtonText = "Add Item"; 
        $scope.isEditingItem = false;
        $scope.newItemSubmitted = false;
        $scope.itemName = undefined;
        $scope.itemDescription = undefined;
        $scope.newImageID = undefined; 
        $scope.displayItemThumbnail = false;
        $scope.newItemStock = "IS";
        $scope.itemCategory = $scope.categoryList[0].id;

        $timeout(function() {
        var e = angular.element('#item-image');
        e.wrap('<form>').closest('form').get(0).reset();
        e.unwrap();
        })
        
        /* clear checked tags */
        var len = $scope.tagList.length;
        var counter = 0;
        for (; counter < len; counter++) {
          if ($scope.tagList[counter].checked) {
            $scope.tagList[counter].checked = undefined;
          } 
        }
    }

    $scope.editItem = function(item) {

        var e = angular.element('#item-image');
        e.wrap('<form>').closest('form').get(0).reset();
        e.unwrap();

        $scope.isEditingItem = true;
        $scope.newItemSubmitted = false;
        $scope.submitItemButtonText = "Save Changes";
        $scope.displayItemThumbnail = item.photo ? true : false;

        if($scope.displayItemThumbnail)
            angular.element('#itemPreview').attr('src', item.photo.image_url).width(50).height(50);

        $scope.itemName = item.name;
        $scope.itemDescription = item.description;
        $scope.itemID = item.id;
        $scope.newImageID = item.photo ? item.photo.id : undefined;
        $scope.itemCategory = item.category ? item.category.id : undefined;
        
        /* clear checked tags */
        var len = $scope.tagList.length;
        var counter = 0;
        for (; counter < len; counter++) {
          if ($scope.tagList[counter].checked) {
            $scope.tagList[counter].checked = undefined;
          } 
        }
        
        var len1 = item.tags.length; 
        var len2 = $scope.tagList.length;
        var counter1 = 0, counter2=0;
        for (; counter1 < len1; counter1++) { 
          for(; counter2 < len2; counter2++) { 
            if ($scope.tagList[counter2].name.match(item.tags[counter1])) { 
              $scope.tagList[counter2].checked = true;
              break;
            }
          }
        } 

    }

    $scope.deleteLocation = function(location) {
        $scope.deletedLocation = location;
        $scope.warningHTML = location.name + ' has been deleted! <a class="alert-link pointer" ng-click="restoreLocation(deletedLocation)">Undo?</a>';
        $scope.showWarning = true;
        StateService.trashOrRestoreLocation(location.id, 'trash').then(function() {
            $scope.getSellerLocations();            
        });  
    }

    $scope.deleteProduct = function(product) {
        $scope.deletedProduct = product;
        $scope.warningHTML = product.name + ' has been deleted! <a class="alert-link pointer" ng-click="restoreProduct(deletedProduct)">Undo?</a>';
        $scope.showWarning = true;
        StateService.trashOrRestoreProduct(product.id, 'trash').then(function() {
            $scope.getSellerItems();            
        });  
    }    

    $scope.resetWarning = function() {
        $scope.warningHTML = '';
        $scope.showWarning = false;
    }

    $scope.restoreLocation = function(location) {
        $scope.resetWarning();
        StateService.trashOrRestoreLocation(location.id, 'restore').then(function() {
            $scope.getSellerLocations();
        })
    }

    $scope.restoreProduct = function(product) {
        $scope.resetWarning();
        StateService.trashOrRestoreProduct(product.id, 'restore').then(function() {
            $scope.getSellerItems();
        })
    }

    $scope.stockValueChanged = function(product) {
        StateService.updateStockValue(product.id, product.stock);
    }

    $scope.fileNameChanged = function(file) {
        $scope.productImageError = undefined;
        
        if (file && file[0]) {
            var reader = new FileReader();
            $scope.displayItemThumbnail = true;
            reader.onload = function(e) {
                angular.element('#itemPreview')
                .attr('src', e.target.result)
                .width(50)
                .height(50);             
            };
            reader.readAsDataURL(file[0]);
        }

        StateService.uploadFile(file[0])
        .success(function(response) {
            $scope.newImageID = response.id;
        })
        .error(function(response) {
          if(response.image) {
            $scope.productImageError = response.image[0];
          }         
        });
    }

    $scope.roundTimeToNearestFive = function(date) {
      var coeff = 1000 * 60 * 5;
      return new Date(Math.round(date.getTime() / coeff) * coeff);
    };

    $scope.open = function($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.opened = true;
    };

    $scope.getSellerItems = function() {
        StateService.getSellerItems().then(function(response) {
            $scope.sellerItems = response.data; 
        })
    }

    $scope.getSellerLocations = function() {
        StateService.getSellerLocations().then(function(response) {
            $scope.sellerLocations = response.data;
            $rootScope.$broadcast('generateMapPins');
            $rootScope.$broadcast('forceRefreshMap');            
        })
    }

    function compareWeekday(a,b) {
      return a.weekday - b.weekday;
    }

    $scope.getMarketLocations = function() {
        StateService.getMarketLocations().then(function(response) {
            for(var i = 0; i < response.data.length; i++) {
              response.data[i].address.hours.sort(compareWeekday);
            }            
            $scope.marketLocations = response.data;
            $rootScope.$broadcast('generateMapPins');
            $rootScope.$broadcast('forceRefreshMap');            
        })
    }



    $scope.leaveMarket = function(market) {
        var data = {
            'market_id' : market.id,
        };
        StateService.leaveMarket(data).then(function() {
            StateService.getAvailableMarkets().then(function() {
                if(StateService.getAvailableMarketList().length > 0)
                    $scope.newLocationMarket = StateService.getAvailableMarketList()[0].id;
            });
            $scope.getMarketLocations();
        })
    }        

    $scope.newItemSubmit = function() {
        $scope.newItemSubmitted = true;
        if($scope.itemForm.$valid && !$scope.productImageError) {
            angular.element('#itemModal').modal('hide');

            /* tags*/
            var tags = [];
            var len = $scope.tagList.length;
            var counter = 0;
            for (; counter < len; counter++) {
              if ($scope.tagList[counter].checked) {
                tags.push($scope.tagList[counter].name);
              }
            }
            
            var item = {
                "id" : $scope.itemID,
                "name" : $scope.itemName,
                "description" : $scope.itemDescription,
                "photo" : $scope.newImageID,
                "stock" : $scope.newItemStock,
                "category" : $scope.itemCategory,
                "tags" : tags
            };

            StateService.createItem(item, $scope.isEditingItem).then(function() {
                $scope.getSellerItems();
            });
        }
    }

    $scope.checkAddress = function() {
      var errorString = 'Please select an address with a ';
      if($scope.locationAddress === undefined)
        errorString += 'street number, ';
      if($scope.locationCity === undefined)
        errorString +=  'city, ';
      if($scope.locationProvince === undefined)
        errorString +=  'province, ';
      if($scope.locationCountry === undefined)
        errorString +=  'country, ';
      if($scope.locationPostalCode === undefined)
        errorString +=  'postal code ';

      errorString = errorString.trim();

      if(errorString.lastIndexOf(',') === errorString.length - 1) {
        errorString = errorString.substr(0, errorString.length - 1);
      }

      if(errorString === 'Please select an address with a') {
        errorString = undefined;
        return errorString;
      }

      var andIndex = errorString.lastIndexOf(',');

      if(andIndex !== -1){
        var str1 = errorString.substr(0, andIndex + 1);
        var str2 = errorString.substr(andIndex + 1, errorString.length - 1);
        errorString = str1 + ' and' + str2;        
      }

      $scope.locationForm.addressText.$setValidity('required', false);
      return errorString;
    }

    $scope.newLocationSubmit = function() {       
        $scope.newLocationSubmitted = true;
        $scope.addressErrorString = $scope.checkAddress();

        if($scope.isCreatingCustomLocation) {
            if($scope.locationForm.$valid && $scope.addressErrorString === undefined) {  
                angular.element('#locationModal').modal('hide'); 
                var hours = [];

                var address = {
                    "addr_line1" : $scope.locationAddress,
                    "city" : $scope.locationCity,
                    "state" : $scope.locationProvince,
                    "country" : $scope.locationCountry,
                    "zipcode" : $scope.locationPostalCode,
                    "latitude" : $scope.latitude,
                    "longitude" : $scope.longitude
                }

                // If we are a one time location...
                if($scope.locationType == 'true') {
                    hours = [{
                        "weekday" : 8,
                        "from_hour" : $scope.startTime.getHours() + ':' + $scope.startTime.getMinutes(),
                        "to_hour" : $scope.endTime.getHours() + ':' + $scope.endTime.getMinutes()
                    }];
                } else {
                    var hours = [];
                    $scope.locationDate = null;
                    for(var i = 0; i < $scope.locationHours.length; i++) {
                        if($scope.locationHours[i].checked) {
                            hours.push({
                                "weekday" : $scope.locationHours[i].weekday,
                                "from_hour" : $scope.locationHours[i].from_hour.getHours() + ':' + $scope.locationHours[i].from_hour.getMinutes(),
                                "to_hour" : $scope.locationHours[i].to_hour.getHours() + ':' + $scope.locationHours[i].to_hour.getMinutes()
                            });
                        }
                    }             
                }

                address.hours = hours;             

                var sellerLocation = {
                    "id" : $scope.locationId,
                    "date" : $scope.locationDate instanceof Date ? $scope.locationDate.getFullYear() + '-' + ($scope.locationDate.getMonth() + 1) + '-' + $scope.locationDate.getDate() : $scope.locationDate,
                    "address" : address,
                    "name" : $scope.locationName,
                    'email' : $scope.emailAtLocation,
                    'phone' : $scope.phoneAtLocation,
                    'description' : $scope.locationDescription,
                };

                StateService.createSellerLocation(sellerLocation, $scope.isEditingLocation).then(function() {
                    $scope.getSellerLocations();
                    $scope.getSellerItems();
                });
            }
        } else {
            angular.element('#locationModal').modal('hide');             
            var data = {
                'market_id' : $scope.newLocationMarket.id,
            };

            StateService.joinMarket(data).then(function() {
                StateService.getAvailableMarkets().then(function() {
                    if(StateService.getAvailableMarketList().length > 0)
                        $scope.newLocationMarket = StateService.getAvailableMarketList()[0];
                });                
                $scope.getMarketLocations();
            })
        }
    }

    $scope.formatAddress = function(address) {
      return address.replace(' ', '+');
    }      

    $scope.getLocation = function(value) {
        var d = $q.defer();
          if(value !== undefined) {
            geocoder.geocode( { 'address': $scope.formatAddress(value)}, function(results, status) {
              if (status == google.maps.GeocoderStatus.OK) {
                $timeout(function() {
                    d.resolve(results)              
                });
              }
            });
        }

        return d.promise;
    }

    $scope.parseGeocoderResult = function(result) {
        var location = {}
        for(var i = 0; i < result.address_components.length; i++) {
            var component = result.address_components[i];

            // Get Street Number
            if($scope.compareGeocoderType(component.types, 'street_number')) 
                location.street_number = component.short_name;
            else if($scope.compareGeocoderType(component.types, 'route'))
                location.route = component.long_name;
            else if($scope.compareGeocoderType(component.types, 'sublocality'))
                location.city = component.long_name;      
            else if($scope.compareGeocoderType(component.types, 'locality'))
                location.city = component.long_name;
            else if($scope.compareGeocoderType(component.types, 'administrative_area_level_1'))
                location.state = component.short_name;
            else if($scope.compareGeocoderType(component.types, 'country'))
                location.country = component.long_name;            
            else if($scope.compareGeocoderType(component.types, 'postal_code'))
                location.postal_code = component.long_name;              
        }
        return location;
    }

    $scope.compareGeocoderType = function(types, compareTo) {
        for(var i = 0; i < types.length; i++) {
            if(types[i] === compareTo) {
                return true;
            }
        }
        return false;
    }

    $scope.makeSelection = function(item) {
        var parsedLocation = $scope.parseGeocoderResult(item);

        $scope.locationAddress = parsedLocation.street_number + ' ' + parsedLocation.route;
        $scope.locationCity = parsedLocation.city;
        $scope.locationProvince = parsedLocation.state;
        $scope.locationCountry = parsedLocation.country;
        $scope.locationPostalCode = parsedLocation.postal_code;
        $scope.latitude = item.geometry.location.k;
        $scope.longitude = item.geometry.location.B;   
    }

    $scope.highlightPins = function(object) {
        if(object && object.marker)          
            object.marker.setAnimation(google.maps.Animation.BOUNCE);
    };

    $scope.unHighlightPins = function(object) {
        if(object && object.marker)          
            object.marker.setAnimation(null);
    };    

    $scope.handleProfileImageFileSelect=function(file) {
        if(file && file[0]) {
        	//show progress modal while opening and resizing image
        	var progress = angular.element('.js-loading-bar'),
      		bar = progress.find('.progress-bar');  
  			progress.modal('show');
  			bar.addClass('animate');
            var reader = new FileReader();
            reader.onload = function (evt) {
                $scope.$apply(function($scope){
                    $scope.profileImage = evt.target.result;
                    var image = new Image();
                    image.src = evt.target.result;
                    //resize image width to 1000 on client side rather than 500 because
                    //there will be some cropping after.
                    $scope.resizeStep(image, 1000).then(function(resizedImage){
                    	bar.removeClass('animate');
  						progress.modal('hide');
                        $scope.profileImage = resizedImage.src;
                        //only trigger the modal show event once the resize is done so that
                        //the resized image can fit onto the modal.
                        angular.element('#profileImageModal').modal('show');
                    });
                });
            };
            reader.readAsDataURL(file[0]);
            //cloning and replacing the file input element with itself in order to clear it
            //this is because the onchange event doesn't get triggered if the user selects the
            //same file as last time.
            angular.element('#profile-image').replaceWith(angular.element('#profile-image').clone(true));

        }
    };

     $scope.selected = function(x) {
    	$scope.profileImageCoords = [x.x, x.y, x.x2, x.y2];
  	};

  	$scope.triggerImageSelect = function () {
		  $timeout(function() {
		    angular.element('#profile-image').trigger('click');
		  }, 100);
		};

	$scope.uploadProfileImage = function() {
		//change the Done button to a loader to prevent clicks while uploading
		angular.element('#uploadProfileImage').button('loading');
		if($scope.profileImage){
            StateService.uploadProfileFile($scope.profileImage, $scope.profileImageCoords, $scope.currentUser.vendor.id)
            .success(function(response) {
                angular.element('#profileImage').css({
                	'background-image': 'url(' + response.image_url +')'
            		});
                angular.element('#profileImageModal').modal('hide');
                angular.element('#uploadProfileImage').button('reset');
            })
            .error(function(response){
                angular.element('#uploadProfileImage').button('reset');
                $scope.profileImageError = response;
            });
          }
	}

	/* function to resize image */
    $scope.resizeStep = function (img, width, quality) {

        function getContext (canvas) {
            var context = canvas.getContext('2d')

            context.imageSmoothingEnabled       = true
            context.mozImageSmoothingEnabled    = true
            context.oImageSmoothingEnabled      = true
            context.webkitImageSmoothingEnabled = true

            return context
        }

        quality = quality || 1.0
     
        var resultD = $q.defer()
        var canvas  = document.createElement( 'canvas' )
        var context = getContext(canvas)
        var type = "image/png"
     
        var cW = img.naturalWidth
        var cH = img.naturalHeight
        var wRatio = cW/width;
        var height = cH / wRatio;
        var dst = new Image()
        var tmp = null
     
        function stepDown () {
            cW = Math.max(cW / 2, width) | 0
            cH = Math.max(cH / 2, height) | 0

            canvas.width  = cW
            canvas.height = cH

            context.drawImage(tmp || img, 0, 0, cW, cH)

            dst.src = canvas.toDataURL(type, quality)

            if (cW <= width || cH <= height) {
                return resultD.resolve(dst)
            }

            if (!tmp) {
                tmp = new Image()
                tmp.onload = stepDown
            }

            tmp.src = dst.src
        }
     
        if (cW <= width || cH <= height || cW / 2 < width || cH / 2 < height) {
            canvas.width  = width
            canvas.height = height
            context.drawImage(img, 0, 0, width, height)
            dst.src = canvas.toDataURL(type, quality)

            resultD.resolve(dst)
        } else {
            stepDown()
        }
     
        return resultD.promise
    }

    $scope.init = function() {
        $scope.getSellerLocations();
        $scope.getSellerItems();
        $scope.getMarketLocations();
        $timeout(function(){
            angular.element("[data-toggle='tooltip']").tooltip();
        }, 1000)

        $scope.resetLocationModal();
    }  

    $scope.init();
  })
  .directive('htmlComp', function($compile, $parse) {
      return {
        restrict: 'E',
        link: function(scope, element, attr) {
          scope.$watch(attr.content, function() {
            element.html($parse(attr.content)(scope));
            $compile(element.contents())(scope);
          }, true);
        }
      }
  })
  .directive('imgCropped', function () {
	  return {
	    restrict: 'E',
	    replace: true,
	    scope: { src:'@', selected:'&' },
	    link: function(scope,element, attr) {
	      var myImg;
	      var clear = function() {
	        if (myImg) {
	          myImg.next().remove();
	          myImg.remove();
	          myImg = undefined;
	        }
	      };
	      scope.$watch('src', function(nv) {        
	        clear();
	        if (nv) {
	          element.after('<img />');
	          myImg = element.next();        
	          myImg.attr('src',nv);
              myImg.attr('id', 'belocal-img-crop')
	        }
	      });	      
	      scope.$on('$destroy', clear);
	      //when the modal is shown, then only we can figure out the display
	      //size of the image to make it responsive to screen size.
            angular.element('#profileImageModal').on('shown.bs.modal', function(e){
                var width = angular.element('#profileImageModal').find('.crop-image-wrapper').width();
                var height = (3/5) * width;
                var quarterWidth = width/4;
                var quarterHeight = height/4;
            $('#belocal-img-crop').Jcrop({
                trackDocument: true,
                aspectRatio:5/3,
                boxWidth: width,
                boxHeight: height,
                addClass: 'jcrop-centered',
                //set the default crop selection area
                setSelect: [quarterWidth, quarterHeight, width-quarterWidth, height-quarterHeight],
                onSelect: function(x) {
                  scope.$apply(function() {
                    scope.selected({cords: x});
                  });
                }
              });
            });
	    }
	  };
	})
  //need this filter to be applied to the src of imgCropped directive or else I get
  //cross domain error from angular when loading the image?!
  .filter('trusted', ['$sce', function ($sce) {
	    return function(url) {
	        return $sce.trustAsResourceUrl(url);
	    };
    }])
  .directive('phone', function() {
    // This is a directive to ensure that an input field contains an phone value.
    var PHONE_REGEX = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;    
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          if (viewValue === "" || PHONE_REGEX.test(viewValue)) {
            // it is valid
            ctrl.$setValidity('phone', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            ctrl.$setValidity('phone', false);
            return undefined;
          }
        });
      }
    };
  });
