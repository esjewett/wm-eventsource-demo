var cfWorker = new Worker('worker.js');
cfWorker.uListeners = {};
cfWorker.onmessage = function(e) {
	if(e.data.return_id && e.data.return_id[0]) { cfWorker.listeners[e.data.return_id[0]](e); };
	if(e.data.uid) {
		cfWorker.uListeners[e.data.uid](e);
		delete cfWorker.uListeners[e.data.uid];
	};
}

cfWorker.post_message = function(message) {
	var uid = Math.round(Math.random() * 100000000);
	var prom;
	if(message) { 
		message.uid = uid;
		prom = new Promise(function(resolve, reject) {
			cfWorker.uListeners[uid] = resolve;
		}); 
		cfWorker.postMessage(message);
	} else {
		// No message
		prom = new Promise(function(resolve, reject) {
			reject('No message');
		});
	}
	return prom;
}

function crossfilter_facade(data, redraw) {
	var cf = {};
	
	if(!redraw) redraw = function() { };
	
	// Throttles redraw in ms
	var redrawThrottle = 25;
	var last_redraw_timestamp = performance.now();
	var open_redraw_request = false;
	var request_redraw = function() {
		// Only request a new redraw if there isn't currently one in queue.
		if(!open_redraw_request && performance.now() - last_redraw_timestamp > redrawThrottle) {
			last_redraw_timestamp = performance.now();
			redraw();
		} else if(!open_redraw_request) {
			open_redraw_request = true;
			window.requestAnimationFrame(request_redraw_internal);
		}
	}
	var request_redraw_internal = function() {
		// Execute redraw if throttle has been exceeded.
		if(performance.now() - last_redraw_timestamp > redrawThrottle) {
			open_redraw_request = false;
			last_redraw_timestamp = performance.now();
			redraw();
		} else {
			window.requestAnimationFrame(request_redraw_internal);
		}
	}
	
	cf.id = "c" + Math.round(Math.random() * 100000);
	
	cfWorker.post_message({
		type: 'crossfilter_var',
		id: cf.id
	});
	
	cf.dimension = function(accessor) {
    
		var dim = {};
		
		dim.id = "d" + Math.round(Math.random() * 100000);
		
		cfWorker.post_message(
			{
				type: 'var_method_function',
				id: cf.id,
				method: 'dimension',
				func: accessor.toString(),
				newId: dim.id
			}
		);
		
		dim.group = function(accessor) {
			var grp = {};
			
			grp.id = "g" + Math.round(Math.random() * 100000);
			
			if(accessor) {
				cfWorker.post_message(
					{
						type: 'var_method_function',
						id: dim.id,
						method: 'group',
						func: accessor.toString(),
						newId: grp.id
					}
				);	
			} else {
				cfWorker.post_message({
					type: 'var_methods',
					id: dim.id,
					newId: grp.id,
					methods: [
						{
							method: 'group',
							args: []
						}
					]
				});
			}
			
				
			var cached_grp_all = []
			var open_grp_alls = 0;
			var grp_all_update_cache_and_request_redraw = function(e) {
				open_grp_alls--;
				if(!e.data.unit && JSON.stringify(cached_grp_all) !== JSON.stringify(e.data)) {
					cached_grp_all = e.data;
					request_redraw();
				} else if (open_grp_alls === 0 && e.data.unit) {
					// Last return is a unit. Call again to force non-unit update, redraw.
					grp.all();
				}
			}
			grp.all = function() {
				var unit = open_grp_alls ? true : false;
				open_grp_alls++;
				
				cfWorker.post_message({
					type: 'var_method_return',
					id: grp.id,
					return_unit: unit,
					method: 'all'
				}).then(grp_all_update_cache_and_request_redraw);
				
				return cached_grp_all;
			}
			
			
			var cached_grp_top = [];
			var open_grp_tops = 0;
			var grp_top_update_cache_and_request_redraw = function(e) {
				open_grp_tops--;
				if(!e.data.unit && JSON.stringify(cached_grp_top) !== JSON.stringify(e.data)) {
					cached_grp_top = e.data;
					request_redraw();
				} else if (open_grp_tops === 0 && e.data.unit) {
					// Last return is a unit. Call again to force non-unit update, redraw.
					grp.top(e.data.arg);
				}
			}
			grp.top = function(num) {
				var unit = open_grp_tops ? true : false;
				
				open_grp_tops++;
				
				cfWorker.post_message({
					type: 'var_method_return',
					id: grp.id,
					return_unit: unit,
					method: 'top',
					arg: num
				}).then(grp_top_update_cache_and_request_redraw);
				
				return cached_grp_top;
			}
			
			grp.reduceSum = function(accessor) {
				cfWorker.post_message(
					{
						type: 'var_method_function',
						id: grp.id,
						method: 'reduceSum',
						func: accessor.toString()
					}
				);
				
				return grp;
			}
			
			grp.order = function(accessor) {
				cfWorker.post_message(
					{
						type: 'var_method_function',
						id: grp.id,
						method: 'order',
						func: accessor.toString()
					}
				);
				
				return grp;
			}
			
			grp.dispose = function() {
				cfWorker.post_message({
					type: 'var_methods',
					id: grp.id,
					methods: [
						{
							method: 'dispose',
							args: []
						}
					]
				});
				
				return grp;
			}
			
			return grp;
		}
		
		var cached_top_value = [];
		var top_value_update_cache_and_redraw = function(e) {
			if(JSON.stringify(cached_top_value) !== JSON.stringify(e.data)) {
				cached_top_value = e.data;
				request_redraw();	
			}
		}
		dim.top = function(num) {
			cfWorker.post_message({
				type: 'var_method_return',
				id: dim.id,
				method: 'top',
				arg: Infinity
			}).then(top_value_update_cache_and_redraw);
			
			return cached_top_value.slice(0,num);
		}
		
		dim.filter = function(filt) {
			cfWorker.post_message({
				type: 'var_methods',
				id: dim.id,
				methods: [
					{
						method: 'filter',
						args: [filt]
					}
				]
			});
			
			return dim;
		}
		
		dim.dispose = function() {
			cfWorker.post_message({
				type: 'var_methods',
				id: dim.id,
				methods: [
					{
						method: 'dispose',
						args: []
					}
				]
			}).then(request_redraw);
		}
		
		dim.filterFunction = function(filterFunc, eval_context) {
			cfWorker.post_message(
				{
					type: 'var_method_function',
					id: dim.id,
					method: 'filterFunction',
					context: eval_context,
					func: filterFunc.toString()
				}
			);
			
			return dim;
		}
		
		dim.filterExact = function(filt) {
			cfWorker.post_message(
				{
					type: 'var_methods',
					id: dim.id,
					methods: [
						{
							method: 'filterExact',
							args: [filt]
						}
					]
				}
			);
			
			return dim;
		}
		
		dim.filterRange = function(filt) {
			cfWorker.post_message(
				{
					type: 'var_methods',
					id: dim.id,
					methods: [
						{
							method: 'filterRange',
							args: [filt]
						}
					]
				}
			);
			
			return dim;
		}
		
		return dim;
	}
	
	cf.groupAll = function() {
		var ga = {};
		
		ga.id = 'ga' + Math.round(Math.random() * 100000);
		
		cfWorker.post_message({
			type: 'var_methods',
			id: cf.id,
			newId: ga.id,
			methods: [
				{
					method: 'groupAll',
					args: []
				}
			]
		});
		
		var cached_ga_value = [];
		var ga_value_update_cache_and_request_redraw = function(e) {
			if(JSON.stringify(cached_ga_value) !== JSON.stringify(e.data)) {
				cached_ga_value = e.data;
				request_redraw();	
			}
		};
		ga.value = function() {
			cfWorker.post_message({
				type: 'var_method_return',
				id: ga.id,
				method: 'value'
			}).then(ga_value_update_cache_and_request_redraw);
			
			return cached_ga_value;
		}
		
		return ga;
	}
	
	cf.add = function(arr) {
		return cfWorker.post_message({
			type: 'var_methods',
			id: cf.id,
			methods: [
				{
					method: 'add',
					args: [arr]
				}
			]
		});
	}
	
	var cached_size_value = 0;
	var size_update_cache_and_request_redraw = function(e) {
		if(cached_size_value !== e.data.data) {
			cached_size_value = e.data.data;
			request_redraw();	
		}
	};
	cf.size = function() {
		cfWorker.post_message({
			type: 'var_unstructured_method_return',
			id: cf.id,
			method: 'size'
		}).then(size_update_cache_and_request_redraw);
		
		return cached_size_value;
	}
	
	cf.remove = function(accessor) {
		if(accessor) {
			return cfWorker.post_message(
				{
					type: 'var_method_function',
					id: cf.id,
					method: 'remove',
					func: accessor.toString()
				}
			);	
		} else {
			return cfWorker.post_message({
				type: 'var_methods',
				id: cf.id,
				methods: [
					{
						method: 'remove',
						args: []
					}
				]
			});
		}
	}
	
	return cf;
}

function reductio_facade() {
	var red = function(cf_facade_group) {
		cfWorker.post_message({
			type: 'call_var_on_var',
			callFunc: red.id,
			arg: cf_facade_group.id
		});
	};
	
	red.id = "r" + Math.round(Math.random() * 100000);
	
	cfWorker.post_message({ type: 'reductio_var', id: red.id });

	red.count = function(bool) {
		cfWorker.post_message({
			type: 'var_methods',
			id: red.id,
			methods: [
				{
					method: 'count',
					args: [bool]
				}
			]
		});
		
		return red;
	};
	
	red.value = function(name) {
		var value = {};
		value.id = "v" + Math.round(Math.random() * 100000);
		
		cfWorker.post_message({ 
			type: 'var_methods', 
			id: red.id,
			newId: value.id,
			methods: [
				{
					method: 'value',
					args: [name]
				}
			]
		});
		
		value.sum = function(accessor) {
			cfWorker.post_message({ 
				type: 'var_methods', 
				id: value.id,
				methods: [
					{
						method: 'sum',
						args: [accessor]
					}
				]
			});
			
			return value;
		}
		
		return value;
	}
	
	red.groupAll = function(accessor) {
		var rga = function(cf_facade_group) {
			cfWorker.post_message({
				type: 'call_var_on_var',
				callFunc: rga.id,
				arg: cf_facade_group.id
			});
		};
		rga.id = "rga" + Math.round(Math.random() * 100000);
		
		cfWorker.post_message({
			type: 'var_method_function',
			id: red.id,
			method: 'groupAll',
			newId: rga.id,
			func: accessor.toString()
		});
		
		rga.count = function(bool) {
			cfWorker.post_message({
				type: 'var_methods',
				id: rga.id,
				methods: [
					{
						method: 'count',
						args: [bool]
					}
				]
			});
			
			return rga;
		};
		
		rga.sum = function(accessor) {
			cfWorker.post_message({
				type: 'var_methods',
				id: rga.id,
				methods: [
					{
						method: 'sum',
						args: [accessor]
					}
				]
			});
			
			return rga;
		};
		
		return rga;
	}
	
	return red;
}