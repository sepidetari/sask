/**
 * The IIFE for the repository.
 */
;
(function($, window, document) {

	/* global jQuery, console */

	'use strict';

	/**
	 * The plugin name.
	 */
	var pluginName = 'repository';

	/**
	 * Data access object.
	 */
	var dao = new DAO({});

	/**
	 * Dialogs.
	 */
	var dialogs = new Dialogs({});

	var _default = {};

	_default.settings = {
		onAddToWorkspace : undefined,
		onLoadToWorkspace : undefined
	};

	_default.options = {};

	/**
	 * The structure template.
	 */
	var structureTemplate = [ {
		text : 'Data',
		id : '#data',
		type : 'root',
		nodes : []
	}, {
		text : 'Extractors',
		id : '#parent2',
		type : 'root',
		nodes : []
	}, {
		text : 'Target graphs',
		id : '#parent3',
		type : 'root',
		nodes : []
	}, {
		text : 'Workflows',
		id : '#parent4',
		type : 'root',
		nodes : []
	} ];

	var Repository = function(element, options) {

		this.$element = $(element);
		this.elementId = element.id;
		this.styleId = this.elementId + '-style';

		this.init(options);

		return {
			options : this.options,
			init : $.proxy(this.init, this),
			remove : $.proxy(this.remove, this),
			refresh : $.proxy(this.refresh, this),
			refreshWorkflows : $.proxy(this.refreshWorkflows, this)
		};
	}

	/**
	 * Init.
	 */
	Repository.prototype.init = function(options) {
		// check dependencies
		if (!jQuery().treeview) {
			logError("'treeview' plugin not initialized.");
			return;
		}

		if (typeof BootstrapMenu !== 'function') {
			logError("'BootstrapMenu' plugin not initialized.");
			return;
		}

		this.options = $.extend({}, _default.settings, options);
		var self = this;
		this.treeview = this.$element.treeview({
			data : structureTemplate
		});

		this.initRebuildTreeListener();
		this.initClasses();
		this.initContextMenu();
		this.initDragNDrop();
	};

	/**
	 * Init the listener on tree rebuild.
	 */
	Repository.prototype.initRebuildTreeListener = function() {
		// to listen on the buildTree method from the underlying plugin:
		// override the default append method and cause it to trigger a custom
		// append event.
		// Then bind a handler to an element for that event
		var originalAppend = $.fn.append;
		$.fn.append = function() {
			return originalAppend.apply(this, arguments).trigger("append");
		};

		var self = this;
		this.$element.bind("append", function() {
			self.initClasses();
			self.initDragNDrop();
		});
	}

	/**
	 * Set the css classes of the nodes.
	 */
	Repository.prototype.initClasses = function() {
		var self = this;
		this.$element.find('li').each(function() {
			var nodeId = $(this).attr('data-nodeid');
			var node = self.treeview.treeview('getNode', nodeId);

			if (node.type) {
				$(this).addClass(node.type);
			}
		});
	};

	/**
	 * Init the drag n drop function.
	 */
	Repository.prototype.initDragNDrop = function() {
		var self = this;
		this.$element.find('li.file, li.extractor, li.db').draggable({
			helper : "clone",
			start : function(event, ui) {
				var node = self.getNodeFromTarget(this);
				ui.helper.data('node', node);
				ui.helper.width(this.clientWidth);
			}
		});
	};

	/**
	 * Remove.
	 */
	Repository.prototype.remove = function() {
		this.destroy();
		$.removeData(this, pluginName);
		$('#' + this.styleId).remove();
	};

	/**
	 * Extract the link from the context menu target
	 */
	Repository.prototype.getNodeFromTarget = function(target) {
		var nodeId = $(target).attr('data-nodeid');
		var node = self.treeview.treeview('getNode', nodeId);
		return node;
	};

	/**
	 * Refresh the repo.
	 */
	Repository.prototype.refreshRepo = function() {
		var self = this;
		var success = function(data) {
			structureTemplate[0].id = data.id;
			structureTemplate[0].nodes = data.nodes;
			self.options.data = structureTemplate;

			self.init(self.options);
		}

		var error = function(data) {
			logError(data);
		}

		dao.getRepoStructure(success, error);
	};

	/**
	 * Refresh the workflows
	 */
	Repository.prototype.refreshWorkflows = function() {
		var self = this;
		var success = function(data) {
			structureTemplate[3].id = data.id;
			structureTemplate[3].nodes = data.nodes;
			self.options.data = structureTemplate;

			self.init(self.options);
		}

		var error = function(data) {
			logError(data);
		}

		dao.getWorkflows(success, error);
	};

	/**
	 * Refresh extractors.
	 */
	Repository.prototype.refreshExtractors = function() {
		var self = this;
		var success = function(data) {
			structureTemplate[1].nodes = [];

			data.forEach(function(microservice) {
				if (microservice.type === "extractor") {
					structureTemplate[1].nodes.push({
						text : microservice.friendlyname,
						id : microservice.serviceId,
						type : 'extractor',
						icon : 'glyphicon glyphicon-wrench'
					})
				}
			});

			self.options.data = structureTemplate;
			self.init(self.options);
		}

		var error = function(data) {
			logError(data);
		}

		dao.discoverMicroservices(success, error);
	};

	/**
	 * Refresh the db.
	 */
	Repository.prototype.refreshDB = function() {
		var self = this;
		var success = function(data) {
			structureTemplate[2].nodes = data;
			self.options.data = structureTemplate;
			self.init(self.options);
		}

		var error = function(data) {
			logError(data);
		}

		dao.getTargetGraphs(success, error);
	};

	/**
	 * Refresh the whole content of the repo.
	 */
	Repository.prototype.refresh = function() {
		this.refreshRepo();
		this.refreshExtractors();
		this.refreshDB();
		this.refreshWorkflows();
	};

	/**
	 * Init the context menu.
	 */
	Repository.prototype.initContextMenu = function() {
		self = this;

		// data root
		new BootstrapMenu('#' + this.elementId + ' li.root[data-nodeid="0"]', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'New folder',
				onClick : function(target) {
					if(target == "#data") {
						target = "";
					}
					
					self.openNewFolderDialog(target);
				}
			} ]
		});

		// db
		new BootstrapMenu('#' + this.elementId + ' li.db', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'Add to Workspace',
				onClick : function(target) {
					self.options.onAddToWorkspace(target);
				}
			} ]
		});

		// extractor
		new BootstrapMenu('#' + this.elementId + ' li.extractor', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'Add to Workspace',
				onClick : function(target) {
					self.options.onAddToWorkspace(target);
				}
			} ]
		});

		// workflow
		new BootstrapMenu('#' + this.elementId + ' li.workflow', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'Load to workspace',
				onClick : function(target) {
					self.options.onLoadToWorkspace(target);
				}
			}, {
				name : 'Rename',
				onClick : function(target) {
					self.openRenameWorkflowDialog(target);
				}
			}, {
				name : 'Remove',
				onClick : function(target) {
					self.openRemoveFromWorkflowsDialog(target);
				}
			} ]
		});

		// file
		new BootstrapMenu('#' + this.elementId + ' li.file', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'Add to Workspace',
				onClick : function(target) {
					self.options.onAddToWorkspace(target);
				}
			}, {
				name : 'Rename',
				onClick : function(target) {
					self.openRenameRepoDialog(target);
				}
			}, {
				name : 'Remove',
				onClick : function(target) {
					self.openRemoveFromRepoDialog(target);
				}
			} ]
		});

		// folder
		new BootstrapMenu('#' + this.elementId + ' li.folder', {
			fetchElementData : this.getNodeFromTarget,
			actions : [ {
				name : 'New folder',
				onClick : function(target) {
					self.openNewFolderDialog(target);
				}
			}, {
				name : 'Rename',
				onClick : function(target) {
					self.openRenameRepoDialog(target);
				}
			}, {
				name : 'Remove',
				onClick : function(target) {
					self.openRemoveFromRepoDialog(target);
				}
			} ]
		});
	};

	/**
	 * Open the rename in repo dialog.
	 */
	Repository.prototype.openRenameRepoDialog = function(target) {
		var self = this;
		var success = function(data) {
			self.refreshRepo();
		}

		var error = function(data) {
			logError(data);
		}

		var positiv = function() {
			var target = $(this).find('input[name="target"]').val();
			var name = $(this).find('input[name="name"]').val();

			dao.renameRepo(success, error, target, name);
			$(this).dialog('close');
		};

		var negativ = function() {
			$(this).dialog("close");
		};

		dialogs.dialogRename(positiv, negativ, target).dialog('open');
	};

	/**
	 * Open the rename in workflows dialog.
	 */
	Repository.prototype.openRenameWorkflowDialog = function(target) {
		var self = this;
		var success = function(data) {
			self.refreshWorkflows();
		}

		var error = function(data) {
			logError(data);
		}

		var positiv = function() {
			var target = $(this).find('input[name="target"]').val();
			var name = $(this).find('input[name="name"]').val();

			dao.renameWorkflow(success, error, target, name);
			$(this).dialog('close');
		};

		var negativ = function() {
			$(this).dialog("close");
		};

		dialogs.dialogRename(positiv, negativ, target).dialog('open');
	};

	/**
	 * Open the new folder dialog.
	 */
	Repository.prototype.openNewFolderDialog = function(target) {
		var self = this;
		var positiv = function() {
			var success = function(data) {
				self.refreshRepo();
			}

			var error = function(data) {
				logError(data);
			}

			var target = $(this).find('input[name="target"]').val();
			var name = $(this).find('input[name="name"]').val();

			dao.createDirectory(success, error, target, name);
			$(this).dialog('close');
		};

		var negativ = function() {
			$(this).dialog("close");
		};

		dialogs.dialogNewFolder(positiv, negativ, target).dialog('open');
	};

	/**
	 * Open the remove from repo dialog.
	 */
	Repository.prototype.openRemoveFromRepoDialog = function(target) {
		var self = this;
		var success = function(data) {
			self.refreshRepo();
		}

		var error = function(data) {
			logError(data);
		}

		var positiv = function() {
			var target = $(this).find('input[name="target"]').val();
			dao.removeFromRepo(success, error, target);
			$(this).dialog("close");
		};

		var negativ = function() {
			$(this).dialog("close");
		};

		dialogs.dialogRemove(positiv, negativ, target).dialog('open');
	};

	/**
	 * Open the remove from workflows dialog.
	 */
	Repository.prototype.openRemoveFromWorkflowsDialog = function(target) {
		var self = this;
		var success = function(data) {
			self.refreshWorkflows();
		}

		var error = function(data) {
			logError(data);
		}

		var positiv = function() {
			var target = $(this).find('input[name="target"]').val();
			dao.removeFromWorkflows(success, error, target);
			$(this).dialog("close");
		};

		var negativ = function() {
			$(this).dialog("close");
		};

		dialogs.dialogRemove(positiv, negativ, target).dialog('open');
	};

	/**
	 * logging function
	 */
	var logError = function(message) {
		if (window.console) {
			window.console.error(pluginName + ": " + message);
		}
	};

	/**
	 * Add plugin.
	 */
	$.fn[pluginName] = function(options, args) {
		// Prevent against multiple instantiations,
		// handle updates and method calls
		var result;

		this.each(function() {
			var _this = $.data(this, pluginName);

			if (typeof options === 'string') {
				if (!_this) {
					logError('Not initialized, can not call method : '
							+ options);
				} else if (!$.isFunction(_this[options])
						|| options.charAt(0) === '_') {
					logError('No such method : ' + options);
				} else {
					if (!(args instanceof Array)) {
						args = [ args ];
					}
					result = _this[options].apply(_this, args);
				}
			} else if (typeof options === 'boolean') {
				result = _this;
			} else {
				$.data(this, pluginName, new Repository(this, $.extend(true,
						{}, options)));
			}
		});

		return result || this;
	};

})(jQuery, window, document);
0