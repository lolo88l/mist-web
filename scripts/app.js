'use strict';



var API_URL = {{API_URL}};



var webApp = angular.module('webApp', ['ngResource', 'ngRoute', 'ngStorage']);

/**
 * Configure the routes
 */
webApp.config(function ($routeProvider, $locationProvider) {

	$routeProvider.when('/notes', {
		templateUrl: 'views/notes.html',
		controller: 'NotesCtrl',
		authenticated: true
	});

	$routeProvider.when('/login', {
		templateUrl: 'views/login.html',
		controller: 'LoginController'
	});

	$routeProvider.otherwise({
		redirectTo: '/notes'
	});

	$locationProvider.html5Mode(true);

});

/**
 * Users resource
 */
webApp.factory('userResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/user', {}, {
		update: {method: 'PUT'},
		login: {method: 'POST', url: API_URL + '/login'}
	});
}]);

/**
 * Toast notifications service
 * This service loads some configuration like, the show duration,
 * timeout... This toastr methods are available:
 *		- success(message, title)
 *		- info(message, title)
 *		- warning(message, title)
 *		- error(message, title)
 */
webApp.factory('toastr', function() {
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"positionClass": "toast-top-right",
		"onclick": null,
		"showDuration": "10000",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
	return {
		success:	function (message, title) { toastr.success(message, title) },
		info:		function (message, title) { toastr.info(message, title) },
		warning:	function (message, title) { toastr.warning(message, title) },
		error:		function (message, title) { toastr.error(message, title) }
	};
});

/**
 * Application controller. It manages:
 *		- Show/hide all menus
 *		- Logout
 */
webApp.controller('ApplicationController', function ($scope, $location, $modal, AuthService, syncService) {

	// Try to recover the authentication from the session/local storage
	AuthService.recover().then(function () {
		// Initialize sync service
		syncService.init();
		// Go to home
		$location.path('/');
	}, function (reason) {
		console.log('Unable to recover session: ' + reason);
	});

	/**
	 * Hide all menus
	 */
	var _hideMenus = function () {
		$('.menu').removeClass('menu-show');
		$('#user-menu').hide();
		$('#add-menu div').hide();
		$('#add-menu div:first-child').show();
		$('#add-menu div:first-child div').show();
		$('html').unbind('click');
	};

	/**
	 * Show and hide left menu dynamically
	 */
	$scope.toggleLeftMenu = function ($event) {
		if (!$('.menu').hasClass('menu-show')) {
			_hideMenus();
			$('.menu').addClass('menu-show');
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show and hide user menu dynamically
	 */
	$scope.toggleUserMenu = function ($event) {
		if ($('#user-menu').is(':hidden')) {
			_hideMenus();
			$('#user-menu').show();
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show and hide the add menu dynamically
	 */
	$scope.toggleAddMenu = function ($event) {
		if ($('#add-menu div:first-child').is(':visible')) {
			_hideMenus();
			$('#add-menu div').show();
			$('#add-menu div:first-child').hide();
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		}
	};

	/**
	 * Show the settings modal and send a broadcast to initialize the
	 * settings controller.
	 */
	$scope.showSettings = function () {
		// Init the settings modal
		$scope.$broadcast('INIT_SETTINGS');
		// Show the user settings modal
		$modal.show('global-settings');
	};

	/**
	 * Log the user out and redirect it to the login page
	 */
	$scope.logout = function () {
		// Logout
		AuthService.logout();
		// Initialize sync service
		syncService.init();
		// Go to login page
		$location.path('/login');
	};

});


/**
 * Settings controller (modal)
 */
webApp.controller('SettingsController', function ($scope, $modal, toastr, Session, userResource) {

	// Clone user in a tmp user to update
	$scope.tmpUser = $.extend(true, {}, Session.user);
	$scope.tmpUser.password = $scope.tmpUser.password2 = '';

	/**
	 * Save the settings and remove the settings modal
	 * If the settings form is not consistent, does nothing
	 * Show a notification if saved or if an error occurs
	 */
	$scope.saveSettings = function () {
		// Check password
		if ($scope.tmpUser.password !== $scope.tmpUser.password2 || ($scope.tmpUser.password !== '' && $scope.tmpUser.password < 6)) {
			return;
		}
		// Remove login, password2, and password if empty
		delete($scope.tmpUser.login);
		delete($scope.tmpUser.password2);
		if (!$scope.tmpUser.password) {
			delete($scope.tmpUser.password);
		}
		// Update the user
		userResource.update($scope.tmpUser,
			function (data) {
				Session.update(data);
				toastr.success('Settings saved');
			}, function () {
				toastr.error('Unable to save settings');
			}
		);
		// Hide modal
		$modal.hide('global-settings');
	};

	/**
	 * Cancel the settings modifications: hide modal
	 */
	$scope.cancelSettings = function () {
		// Hide modal
		$modal.hide('global-settings');
	};

	/**
	 * Get the image from input, resize it to 85px/85px,
	 * transform it in base64 and update the temporary user
	 */
	$scope.uploadImage = function () {
		var input = $('#user-image-input').get(0);
		if (input.files && input.files[0]) {
			// Create canvas for resizing image
			var canvas = document.getElementById("user-image-canvas");
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext("2d");
			// Create image object with base64 upload
			var image = new Image();
			reader.onload = function (e) {
				image.src = e.target.result;
			};
			// Read the image from the input in base64
			var reader = new FileReader();
			image.onload = function() {
				ctx.drawImage(image, 0, 0, 85, 85);
				$scope.tmpUser.image = canvas.toDataURL();
			};
			reader.readAsDataURL(input.files[0]);
		}
	};

});

/**
 * Authentication service to login/logout and manage the Session.
 */
webApp.factory('AuthService', function ($http, $q, $timeout, $sessionStorage, $localStorage, userResource, Session) {

	return {

		/**
		 * Login by sending the credentials to the API and waiting for a token.
		 * This method returns a promise.
		 *
		 * If ok, store the token into session/local storage and resolve the promise
		 * If not ok, reject the promise with an error code and message
		 */
		login: function (credentials) {
			var promise = $q.defer();
			// If login attempt success
			var success = function (data, responseHeaders) {
				// Create the session
				Session.create(data.token, data.user);
				// Send the token on each API request
				$http.defaults.headers.common['API-Token'] = data.token;
				// Save token in local/session storage
				if (credentials.remember) {
					$localStorage.token = data.token;
				} else {
					$sessionStorage.token = data.token;
				}
				// Initialize sync service

				// Connected
				promise.resolve();
			};
			// If login attempt fails
			var error = function (httpResponse) {
				if (httpResponse.status === 401) {
					promise.reject({code: 1, message: "Bad credentials"});
				} else {
					promise.reject({code: 2, message: "Unknown error"});
				}
			};
			// Try to log in
			userResource.login(credentials, success, error);
			// Return a promise
			return promise.promise;
		},

		/**
		 * Logout by destroying the token
		 */
		logout: function () {
			// Destroy session
			Session.destroy();
			// No more send the token on each API request
			delete($http.defaults.headers.common['API-Token']);
			// Delete token in local/session storage
			delete($sessionStorage.token);
			delete($localStorage.token);
		},

		/**
		 * Try to recover the authentication by searching for a token in
		 * session/local storage. If found, ask for user information.
		 */
		recover: function () {
			var promise = $q.defer();
			// Search for token in local/session storage
			var token = null;
			if ($sessionStorage.token) {
				token = $sessionStorage.token;
			} else if($localStorage.token) {
				token = $localStorage.token;
			}
			// Send the token on each API request
			$http.defaults.headers.common['API-Token'] = token;
			// If token found
			if (token) {
				// If user information retrieval success
				var success = function (data, responseHeaders) {
					// Create the session
					Session.create(token, data);
					// Connected
					promise.resolve();
				};
				// If user information retrieval fails
				var error = function (httpResponse) {
					// No more send the token on each API request
					delete($http.defaults.headers.common['API-Token']);
					// Not connected
					promise.reject("Unknown error when retrieving user");
				};
				userResource.get(success, error);
			}
			// If no token found
			else {
				$timeout(function () {
					promise.reject("No token found in storage");
				});
			}
			// Return a promise
			return promise.promise;
		},

		/**
		 * Check if the user is authenticated or not
		 */
		isAuthenticated: function () {
			return !!Session.token;
		}

	};

});

/**
 * Session containing the user, token...
 */
webApp.service('Session', function ($rootScope) {
	this.create = function (token, user) {
		this.token = $rootScope.token = token;
		this.user = $rootScope.user = user;
	};
	this.destroy = function () {
		this.token = $rootScope.token = null;
		this.user = $rootScope.user = null;
	};
	this.update = function (user) {
		this.user = $rootScope.user = user;
	}
	return this;
});

/**
 * Route Change Listener to check if the user is authenticated where he must be
 */
webApp.run(function ($rootScope, $location, AuthService) {

	$rootScope.$on('$routeChangeStart', function (event, next, current) {
		// If not authenticated and asking for an authenticated page
		if (next.authenticated && !AuthService.isAuthenticated()) {
			// Stop routing
			event.preventDefault();
			// Go to login page
			$location.path('/login');
		}
		// If authenticated and going on the login page
		else if (AuthService.isAuthenticated() && next.$$route && next.$$route.originalPath === '/login') {
			// Stop routing
			event.preventDefault();
			// Go to home page
			$location.path('/');
		}
	});

});

/**
 * HTTP Interceptor to catch 401 statuses and redirect the user to the /login page.
 */
webApp.config(function ($httpProvider) {

	$httpProvider.interceptors.push(function ($rootScope, $location, $q, $sessionStorage, $localStorage, $modal, Session) {
		return {
			responseError: function (rejection) {
				if (rejection.status === 401) {
					// If we were authenticated, show modal (does nothing if already shown)
					if (!!Session.token) {
						$modal.show('global-login');
					}
					// If we were not authenticated, redirect to login form
					else {
						$location.path('/login');
					}
					// No more send the token on each API request
					delete($httpProvider.defaults.headers.common['API-Token']);
					// Delete token in local/session storage
					delete($sessionStorage.token);
					delete($localStorage.token);
				}
				return $q.reject(rejection);
			}
		};
	});

});

/**
 * Sync service to sync resources with the server.
 *
 * This service is generic so you may pass any resource you want to sync.
 * Keep in mind a Resource provider must be present and named: "{{type}}Resource"
 */
webApp.factory('syncService', function ($interval, $rootScope, $injector, toastr) {

	// Sync status is shared
	$rootScope.syncStatus = 'synced';

	/**
	 * Initialize the sync service, nothing to sync and status synced
	 */
	var init = function () {
		$rootScope.syncStatus = 'synced';
		newResources = {};
		dirtyResources = {};
		deletedResources = {};
		syncErrors = {};
	};

	/**
	 * Handle sync status
	 */
	var setStatusSyncing = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// If the sync is in error, it is not possible to set it to syncing, wait for good sync before
		if ($rootScope.syncStatus === 'error') return;
		// Set status
		$rootScope.syncStatus = 'syncing';
	};
	var setStatusSynced = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// Set status
		$rootScope.syncStatus = 'synced';
	};
	var setStatusError = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// If the sync pass for the first time in error, show an error notification
		if ($rootScope.syncStatus !== 'error') toastr.error('Unable to sync');
		// Set status
		$rootScope.syncStatus = 'error';
	};

	/**
	 * Prevent leave page when not totally synced
	 */
	window.onbeforeunload = function(event) {
		event = event || window.event;
		var message = '';
		switch ($rootScope.syncStatus) {
			case 'syncing':		message = 'Data is syncing, if you leave, you will loose some data...'; break;
			case 'error':		message = 'Error during sync, if you leave, you will loose some data...'; break;
			case 'stopped':		if (_getTodo() < 0) break;
								message = 'Sync is stopped, if you leave, you will loose some data...'; break;
		}
		if (message !== '') {
			if (event) { event.returnValue = message; }		// For IE and Firefox
			return message;									// For Safari
		}
	};

	//	Save resources to sync, new resources have no _id but a tmpId
	var newResources = {};
	var dirtyResources = {};
	var deletedResources = {};
	// Save the sync errors
	var syncErrors = {};
	// Save the HTTP resources dynamically injected
	var httpResources = {};

	/**
	 * Handle note modifications.
	 * Add new notes to sync, updated notes...
	 */
	var newResource = function (type, resource) {
		// If first resource of this type, initialize the object
		if (!newResources[type]) newResources[type] = {};
		// Sync it
		newResources[type][resource.tmpId] = resource;
		setStatusSyncing();
	};
	var updateResource = function (type, resource) {
		// If first resource of this type, initialize the object
		if (!dirtyResources[type]) dirtyResources[type] = {};
		// If the resource is not new and is not already in
		if (resource._id && !dirtyResources[type][resource._id]) {
			dirtyResources[type][resource._id] = resource;
			setStatusSyncing();
		}
	};
	var deleteResource = function (type, resource) {
		// If first resource of this type, initialize the object
		if (!deletedResources[type]) deletedResources[type] = {};
		// If the resource is not new
		if (resource._id) {
			delete(dirtyResources[type][resource._id]);
			deletedResources[type][resource._id] = resource;
			setStatusSyncing();
		}
	};

	/**
	 * Get the number of actions to do for sync
	 */
	var _getTodo = function () {
		var count = 0;
		for (var key in newResources) { count += Object.keys(newResources[key]).length; }
		for (var key in dirtyResources) { count += Object.keys(dirtyResources[key]).length; }
		for (var key in deletedResources) { count += Object.keys(deletedResources[key]).length; }
		return count;
	};

	/**
	 * Get the HTTP Resource to sync with
	 */
	var _getHTTPResource = function (type) {
		type = type.toLowerCase();
		if (!httpResources[type]) {
			httpResources[type] = $injector.get(type + 'Resource');
		}
		return httpResources[type];
	};

	/**
	 * Remove a resource from syncing (tables and errors)
	 */
	var _removeResource = function (resource) {
		if (resource._id) {
			for (var key in dirtyResources) {
				for (var id in dirtyResources[key]) {
					if (id === resource._id) delete(dirtyResources[key][id])
				}
			}
			for (var key in deletedResources) {
				for (var id in deletedResources[key]) {
					if (id === resource._id) delete(deletedResources[key][id])
				}
			}
			delete(syncErrors[resource._id]);
		} else {
			for (var key in newResources) {
				for (var id in newResources[key]) {
					if (id === resource.tmpId) delete(newResources[key][id])
				}
			}
			delete(syncErrors[resource.tmpId]);
		}
	}

	/**
	 * Sync method
	 * When error occurs, the resources in error are added in a syncErrors
	 * object.
	 */
	var sync = function () {
		// Do not sync if stopped
		if ($rootScope.syncStatus === 'stopped') {
			return;
		}
		// Get actions to do, and check if something to do
		var todo = _getTodo();
		if (todo === 0) {
			setStatusSynced();
			return;
		}
		// If a resource sync success
		var success = function (resource) {
			if (resource._id) {
				delete(syncErrors[resource._id]);
			} else {
				delete(syncErrors[resource.tmpId]);
			}
			checkEndOfSync();
		};
		// If a resource sync error
		var error = function (response, resource) {
			if (resource._id) {
				syncErrors[resource._id] = 1;
			} else {
				syncErrors[resource.tmpId] = 1;
			}
			checkEndOfSync();
			// Check for conflict (updated)
			if (response.status === 409) {
				$rootScope.syncStatus = 'stopped';
				_removeResource(resource);
				$rootScope.$broadcast('CONFLICT', resource, response.data);
			}
			// Check for conflict (deleted)
			if (response.status === 404) {
				$rootScope.syncStatus = 'stopped';
				_removeResource(resource);
				$rootScope.$broadcast('CONFLICT', resource, null);
			}
		};
		// Check if the sync is done, and set the status
		var checkEndOfSync = function () {
			todo--;
			if (todo === 0) {
				if (Object.keys(syncErrors).length === 0) {
					setStatusSynced();
				} else {
					setStatusError();
				}
			}
		}
		// Handle new resources
		Object.keys(newResources).forEach(function (type) {
			var httpResource = _getHTTPResource(type);
			Object.keys(newResources[type]).forEach(function (id) {
				var resource = newResources[type][id];
				delete(newResources[type][id]);
				var clone = $.extend(true, {}, resource);
				delete(clone.tmpId);
				httpResource.save(clone,
					function (data) {
						success(resource);
						resource._id = data._id;
						resource._revision = data._revision;
						delete(resource.tmpId);
					}, function (httpResponse) {
						newResource('NOTE', resource);
						error(httpResponse, resource);
					}
				);
			});
		});
		// Handle dirty resources
		Object.keys(dirtyResources).forEach(function (type) {
			var httpResource = _getHTTPResource(type);
			Object.keys(dirtyResources[type]).forEach(function (id) {
				var resource = dirtyResources[type][id];
				delete(dirtyResources[type][id]);
				httpResource.update({id: id}, resource,
					function (data) {
						success(resource);
						resource._revision = data._revision;
					}, function (httpResponse) {
						updateResource('NOTE', resource);
						error(httpResponse, resource);
					}
				);
			});
		});
		// Handle deleted resources
		Object.keys(deletedResources).forEach(function (type) {
			var httpResource = _getHTTPResource(type);
			Object.keys(deletedResources[type]).forEach(function (id) {
				var resource = deletedResources[type][id];
				delete(deletedResources[type][id]);
				httpResource.delete({id: id},
					function () {
						success(resource);
					}, function (httpResponse) {
						deleteResource('NOTE', resource);
						error(httpResponse, resource);
					}
				);
			});
		});
	};

	// Sync the changes every X seconds
	var timer = $interval(sync, 2000);

	// Return change handling methods
	return {
		init:				init,
		newResource:		newResource,
		updateResource:		updateResource,
		deleteResource:		deleteResource
	};
});

/**
 * Modal service
 */
webApp.service('$modal', function ($rootScope) {

	// Modal template url
	$rootScope.modal = "";

	// Modal parameters
	this.parameters = {};

	// Get the modal url from the name
	var _getModalUrl = function (name) {
		return 'modals/' + name + '.html';
	}

	// Show the modal
	this.show = function (name, params) {
		if (!$rootScope.modal) {
			if (params) {
				this.parameters = params;
			}
			this.dim();
			$rootScope.modal = _getModalUrl(name);
		}
	};

	// Hide the modal
	this.hide = function (name) {
		if (this.isShown(name)) {
			$rootScope.modal = "";
			this.clear();
			this.parameters = {};
		}
	}

	// Dim the screen
	this.dim = function () {
		if (!$rootScope.modal) {
			$('#nav-search-content input').attr('tabindex', -1);
			$('.dim').addClass('dim-active');
		}
	}

	// Clear the screen
	this.clear = function () {
		if (!$rootScope.modal) {
			$('.dim').removeClass('dim-active');
			$('#nav-search-content input').attr('tabindex', 1);
		}
	}

	// Return whether the modal is shown or not
	this.isShown = function(name) {
		return $rootScope.modal === _getModalUrl(name);
	}

	// Export methods
	return this;

});