//Created by Aran Khanna All Rights Reserved
	
// Global Variables
	// Count of requests from background script (mainly for debugging)
	var background_reqs = 0;
	// Date range of the data to visualize
	var to_val = Date.now();
	var from_val = Date.now();
	// Is the bubble graph or the chart the currently selected visualization
	var is_bubble = true;
	// Is the visualization currently loading data
	var loading = false;
	// The datetime of the oldest transaction stored locally
	var oldest_retrieved = Date.now();
	// The URL of the next page of user transactions
	var next = "";
	// Whether or not there are more transactions available for this user
	var moreTransactions = true;
// Data Structures
	// List of all transactions pulled from the current user's feed.
	var trans_list = [];
// User Data Variables
	// The JSON for the currently selected user
	var current_user = null;

// The Logic
	// On the first request from the background script pull the transactions from the url it extracts.
	chrome.runtime.onMessage.addListener(
	  	function(request, sender, sendResponse) {
	  		if(next == ""){
				getRestMessages(request.url);
	  		}
			sendResponse();
	  	}
	);

	// When the document is ready add the toolbar and render the bubble visualization
	$( document ).ready(function() {
		// Set up control panel
		var dateTab = document.createElement('div');
		dateTab.id = 'date-tab';
		$('#date-tab').css('height', '400px');
		$('#date-tab').css('width', '100%');
		$('#left_and_right').prepend(dateTab);

		// Set up date selectors
		var fromDate =  document.createElement('input');
		fromDate.id = 'from';
		$('#date-tab').append(fromDate);
		var toDate =  document.createElement('input');
		toDate.id = 'to';
		$('#date-tab').append(toDate);

		// set up rerendering on date change
		$( "#from" ).datepicker({
			onSelect: function(dateText) {
				if(!loading){
    				rerender(dateText, true);
    			}
    		}
  		});
		$( "#to" ).datepicker({
			onSelect: function(dateText) {
				if(!loading){
    				rerender(dateText, false);
    			}
    		}
  		});

		// Set up visualization switcher
 		var switcher = document.createElement('button');
 		switcher.id = 'switcher';
 		$('#date-tab').append(switcher);
 		$('#switcher').html("Transaction Chart");
 		$('#switcher').click(function() {
			if(!loading){
		        is_bubble = !is_bubble;
		        switchAssets();
		        rerender(null, null);
	    	}	
	    });

 		// Insert div for chart
		var chartTab = document.createElement('div');
		chartTab.id = 'chart-tab';
		$('#chart-tab').css('height', '400px');
		$('#chart-tab').css('width', '100%');
		$('#left_and_right').prepend(chartTab);

		// Insert div for graph
		var bubbleTab = document.createElement('div');
		bubbleTab.id = 'bubble-tab';
		$('#bubble-tab').css('height', '400px');
		$('#bubble-tab').css('width', '100%');
		$('#left_and_right').prepend(bubbleTab);
	});
	
	// Switches DOM assests' visibility when the visualization changes
	function switchAssets(){
		if(is_bubble){
		    $('#chart-tab *').attr('visibility', 'hidden');
			$('#chart-tab').css('display', 'none');
			$('#bubble-tab *').attr('visibility', 'visible');
			$('#bubble-tab').css('display', 'block');
			$('#switcher').html("Transaction Chart");
			$('#deselect-all').remove();
			$('#select-all').remove();
		}else{
			$('#bubble-tab *').attr('visibility', 'hidden');
			$('#bubble-tab').css('display', 'none');
			$('#chart-tab *').attr('visibility', 'visible');
			$('#chart-tab').css('display', 'block');
			$('#switcher').html("Bubble Graph");
		}
	}

	// Recursively pull older tranasction data (emulating venmo's native requests) till we are at the oldDate or there is no more data left
	function updateOldest(oldDate, func, additionalArgs){
		$.ajax({
	        type:"GET",
	        url: next,
	        processData: false,
	        success: function(json) {
	        	console.log(json.data);
	        	var endpoint = next
	        	if("paging" in json){
	        		next = json.paging.next;
	        	}else{
	        		moreTransactions = false;
	        	}
	        	// Parse json string and extract data info for each message
	        	loadData(json, endpoint);
	        	if(oldDate < oldest_retrieved && moreTransactions){
	        		updateOldest(oldDate, func, additionalArgs);
	        	}else{
	        		func.apply(null, additionalArgs);
	        	}
	        }
		});
	}

	// If the date changes (or the chart type changes) rerender the currently selected visualization with the new parameters
	function rerender(dateText, isFrom){
		if(isFrom != null && dateText != null){
			var date = Date.parse(dateText);
			if(isFrom){
				from_val = date;
			}else{
				to_val = date;
			}
		}
		// Automatically render with correct function, parameter values and order
		var diff = to_val - from_val;
		var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
		if(is_bubble){
			if(diff > 0){
				renderBubbleChart(from_val, to_val);
			}else if(diff < 0){
				renderBubbleChart(to_val, from_val);
			}else{
				renderBubbleChart(from_val, to_val+oneDay);
			}
		}else{
			var diffDays = Math.round(Math.abs(diff)/(oneDay));
			var resolution = 'w';

			if(diffDays <= 2){
				resolution = 'h';
			}else if(diffDays <= 31){
				resolution = 'd';
			}else if(diffDays <= 364){
				resolution = 'w';
			}else{
				resolution = 'm';
			}
			if(diff > 0){
				renderLineChart(from_val, to_val, resolution);
			}else if(diff < 0){
				renderLineChart(to_val, from_val, resolution);
			}else{
				renderLineChart(from_val, to_val+oneDay, resolution);
			}
		}
	}

	// Generate get a new date one jump away from the old_date
	function getNewDate(resolution, jump, old_date){
		cur_date = new Date(old_date);
		if(resolution == 'd'){
			return cur_date.setDate(cur_date.getDate() + jump);
		}else if(resolution == 'h'){
			return cur_date.setHours(cur_date.getHours() + jump);
		}else if(resolution == 'w'){
			return cur_date.setDate(cur_date.getDate() + (jump*7));
		}else if(resolution == 'm'){
			return cur_date.setDate(cur_date.getDate() + (jump*30));
		}
	}

	// Generate a range of dates with a certain resolution bewteen start and end dates
	function generateRange(from, to, resolution){
		var range = [];
		var end_date =  new Date(getNewDate(resolution, 1, to));
		var cur_date = new Date(from);
		while(cur_date.getTime() < end_date.getTime()){
			var mini_range = [cur_date];
			cur_date =  new Date(getNewDate(resolution, 1, cur_date.getTime()));
			mini_range.push(cur_date);
			if(mini_range[1].getTime() < to){
				range.push(mini_range);
			}else{
				mini_range[1] = new Date(to);
				range.push(mini_range);
				break;
			}
		}
		return range;
	}

	// Turns a range of date objects into human readable string
	function toRangeString(range, resolution){
		var start_range = range[0].toString().split(" ");
		var end_range = range[1].toString().split(" ");
		if(resolution == 'h'){
			return start_range[1] +" "+ start_range[2] +" "+start_range[4]+" to "+end_range[1] +" "+ end_range[2]+" "+end_range[4];
		}else{
			return start_range[1] +" "+ start_range[2] + " to "+end_range[1] +" "+ end_range[2];
		}
	}

	// Render the line chart from scratch
	function renderLineChart(from, to, resolution){
		if(current_user == null){
			return;
		}
		// Update data until we are good
		if(from < oldest_retrieved && moreTransactions){
			loading = true;
			$('#left_and_right').prepend('<div id="image-container"></div><div id="loading-image"><img src="https://i.imgur.com/0flp5sz.gif" alt="Loading..." />');
			updateOldest(from, renderLineChart, [from, to, resolution]);
			return;
		}
		// Remove loading
		loading = false;
		$('#loading-image').remove();
		$('#image-container').remove();

		// Get Time Range
		var current_range = generateRange(from, to, resolution);

		// Load data into chart form
		var user_dict = {};
		var data_providers = [];
		$.each(trans_list, function(index, transaction){
			// Add new users
			if(!(transaction.id in user_dict)){
				user_dict[transaction.id] = {
					name: transaction.name,
					data: []
				};
				for(var i=0; i<current_range.length; i++){
					user_dict[transaction.id].data.push(0);
				}
			}
			// Add all data in ranges for user
			for(var i=0; i<current_range.length; i++){
				if(transaction.created_time >= current_range[i][0].getTime() && transaction.created_time < current_range[i][1].getTime()){
					user_dict[transaction.id].data[i] += 1;
					data_providers.push(transaction.id);
					break;
				}
			}
		});	

		var series = [];
		for (var key in user_dict) {
			if(data_providers.indexOf(key) > -1){
				series.push(user_dict[key]);
			}
		}
		var categories = [];
		for (var key in current_range) {
			categories.push(toRangeString(current_range[key], resolution));
		}

		// Create chart
		$('#chart-tab').highcharts({
	        chart: {
	            type: 'line'
	        },
	        title: {
	            text: 'Transaction History For '+current_user.name
	        },
	        xAxis: {
	            categories: categories
	        },
	        yAxis: {
	            title: {
	                text: 'Number of Transactions'
	            },
	            floor: 0
	        },
	        plotOptions: {
	        	series: {
	        		cursor: 'pointer',
	        		point: {
	        			events: {
	        				click: function (e){
	        					// Builds transaction popup box
	        					var transactions = pullTransactions(this.series.name, this.x, this.y, current_range);
	        					if(transactions.length == 0){
	        						return;
	        					}

	        					var start = new Date(Date.parse(current_range[this.x][0]));
	        					var end = new Date(Date.parse(current_range[this.x][1]));
	        					var range = (start.getMonth()+1)+"/"+start.getDate()+" - "+(end.getMonth()+1)+"/"+end.getDate();
	        					if(start.getMonth() == end.getMonth() && start.getDate() == end.getDate()){
	        						var range = (start.getMonth()+1)+"/"+start.getDate();
	        					}

	        					$('#popup').remove();
	        					var popup = document.createElement('div');
								popup.id= 'popup';
	        					$('body').append(popup);
	        					var html = "<div id='popup-header'>"+this.series.name+"<br>"+range+"</div><div id='popup-body'>"
	        					for(var i=0;i<transactions.length;i++){
	        						html += transactions[i]+"<br>";
	        					}
	        					html+="</div>"
	        					$('#popup').html(html);
								$('#popup').css('position', 'absolute');
	        					$('#popup').css('left', e.pageX+'px');
	        					$('#popup').css('top', e.pageY+'px');
	        					$('#popup').css('background-color', '#fff');
	        					$('#popup').css('border', this.series.color+' solid 1px');
	        					$('#popup').css('box-shadow', 'rgba(0, 0, 0, 0.5) 0 3px 3px');
	        					$('#popup-body').css('height', '80px');
	        					$('#popup-body').css('width', '100px');
	        					$('#popup-body').css('overflow', 'auto');
	        					$('#popup-header').css('font-weight', 'bold');
	        					$('#popup-header').css('border-bottom', 'gray solid 1px');
	        					$('.from').css('color', '#e74c3c');
	        					$('.to').css('color', '#30cd73');
	        				}
	        			}
	        		}
	        	}
	        },
	        series: series
    	});

		// Popup removal
		$(document).mouseup(function (e){
		    var container = $('#popup');

		    if (!container.is(e.target) // if the target of the click isn't the container
		        && container.has(e.target).length === 0) // nor a descendant of the container
		    {
		        container.hide();
		    }
		});
		
		// Refresh buttons
		// Cleanup any old buttons associated with a past chart
		$('#deselect-all').remove();
		$('#select-all').remove();

		// Set up select all and deselect all buttons for chart
		var deselectAll = document.createElement('button');
 		deselectAll.id = 'deselect-all';
 		$('#date-tab').append(deselectAll);
 		$('#deselect-all').html("Deselect All");
 		var selectAll = document.createElement('button');
 		selectAll.id = 'select-all';
 		$('#date-tab').append(selectAll);
 		$('#select-all').html("Select All");
    	$('#deselect-all').click(function() {  
    		var chart = $('#chart-tab').highcharts();
	        var series = chart.series;
	        for(var i = 0; i < series.length; i++){
	            series[i].hide();
	        }
	    });
	    $('#select-all').click(function() {
	        var chart = $('#chart-tab').highcharts();
	        var series = chart.series;
	        for(var i = 0; i < series.length; i++){
	            series[i].show();
	        }
	    });
	}

	// Pull transactions in the time range for display in the popup box
	function pullTransactions(name, range_index, limit, current_range){
		var pulled_transactions = [];
		var i = 0;
		while(pulled_transactions.length < limit && i < trans_list.length){
			var transaction = trans_list[i];
			if(transaction.name == name && transaction.created_time >= Date.parse(current_range[range_index][0]) && transaction.created_time < Date.parse(current_range[range_index][1])){
				var date_time = new Date(transaction.created_time);
				var pad_mins = date_time.getMinutes();
				// Dirty way to pad minute string to look standard
				if(pad_mins < 10){
					pad_mins = "0"+pad_mins;
				}
				if (transaction.isFrom){
					pulled_transactions.push("<div class='transaction'><div class='from'>$-</div>"+transaction.message+"<br>"+(date_time.getMonth()+1)+"/"+date_time.getDate()+" "+date_time.getHours()+":"+pad_mins+"</div>");
				}else{
					pulled_transactions.push("<div class='transaction'><div class='to'>$+</div>"+transaction.message+"<br>"+(date_time.getMonth()+1)+"/"+date_time.getDate()+" "+date_time.getHours()+":"+pad_mins+"</div>");
				}
			}
			i++;
		}
		return pulled_transactions;
	}

	// Pads user object with the message and time
	function extractTransaction(transaction, user){
		user['created_time'] = Date.parse(transaction.created_time);
		user['message'] = transaction.message;
		return user;
	}

	// Loads pulled user data into the transaction list in memory
	function loadData(json, endpoint){
	    $.each(json.data, function(index, transaction){
	    	// Set current user if not set
			if(current_user == null){
				var cur_id = endpoint.split("/")[6];
				if(transaction.actor.id == cur_id){
					current_user = transaction.actor;
				}else if (transaction.transactions[0].target.id == cur_id){
					current_user = transaction.transactions[0].target;
				}else{
					return;
				}
			}
			// Check if element is a valid transaction
			if(!('actor' in transaction)){
				return;
			}

			// Figure out which way the money is flowing from current user and add to transaction list 
			var from = extractTransaction(transaction, transaction.actor);
			var to = extractTransaction(transaction, transaction.transactions[0].target);
			if(transaction.type=="charge"){
				var tmp = from;
				from = to;
				to = tmp;
			}
			if(from.id == current_user.id){
				to['isFrom'] = true;
				trans_list.push(to);
			}else if(to.id == current_user.id){
				from['isFrom'] = false;
				trans_list.push(from);
			}
			if(oldest_retrieved > to.created_time){
				oldest_retrieved = to.created_time;
			}
    	});
	}

	// Gets and parses json data on user transaction from hitting venmo feed endpoint
	function getRestMessages(endpoint) {
		next = endpoint;
		background_reqs++;
    	console.log("requesting "+background_reqs);
    	$.ajax({
	        type:"GET",
	        url: endpoint+"?limit=20",
	        processData: false,
	        success: function(json) {
	        	console.log(json);
	        	if("paging" in json){
	        		next = json.paging.next;
	        	}else{
	        		moreTransactions = false;
	        	}
	        	// Parse json string and extract data info for each message
	        	loadData(json, endpoint);
	        	from_val = oldest_retrieved;
	        	$("#to").datepicker("setDate", new Date(to_val));
	        	$("#from").datepicker("setDate", new Date(from_val));
	        	renderBubbleChart(from_val, to_val);
	        }
		});
	}

	// Creates bubble chart
	function renderBubbleChart(from, to){
		if(current_user == null){
			return;
		}

		// Load the data needed for the visualization
		if(from < oldest_retrieved && moreTransactions){
			loading = true;
			$('#left_and_right').prepend('<div id="image-container"></div><div id="loading-image"><img src="https://i.imgur.com/0flp5sz.gif" alt="Loading..." />');
			updateOldest(from, renderBubbleChart, [from, to]);
			return;
		}
		// Remove loading
		loading = false;
		$('#loading-image').remove();
		$('#image-container').remove();
		$("svg").remove();

		// Create ranges with high resolution
		var ranges = generateRange(from, to, 'd');

		// Load data into graph data structures
	    var dataset = {nodes: [{name: current_user.name, amt: 1, picture: current_user.picture}], edges: []};
		$.each(trans_list, function(index, transaction){
			// Aggregates all user's transactions with the current user in the set time range
			if(transaction.created_time >= ranges[0][0].getTime() && transaction.created_time < ranges[ranges.length-1][1].getTime()){
				index = -1;
				for(var i = 0; i<dataset.nodes.length; i++){
					if(dataset.nodes[i]['name'] == transaction.name){
						index = i;
						break;
					}
				}
				if(index == -1){
					dataset.nodes.push({name: transaction.name, amt: 0, picture: transaction.picture});
					index = dataset.nodes.length-1;
				}
				dataset.nodes[index].amt += 1;
				dataset.nodes[0].amt += 1;

				edge_index = -1;
				for(var i = 0; i<dataset.edges.length; i++){
					if(transaction.isFrom){
						if(dataset.edges[i].target == index){
							edge_index = i;
							break;
						}
					}else{
						if(dataset.edges[i].source == index){
							edge_index = i;
							break;
						}
					}
				}
				if(edge_index == -1){
					if(transaction.isFrom){
						dataset.edges.push({source: 0, target: index, weight: 0});
					}else{
						dataset.edges.push({source: index, target: 0, weight: 0});
					}
					edge_index = dataset.edges.length-1;
				}
				dataset.edges[edge_index].weight += 1
			}
		});	
		
		// Aribitary size of canvas and line scaling size
		var w = 1000,
	    h = 600;
	    var lineSizeScale = Math.min(dataset.nodes.length * 30, 400);

	    var nodes = dataset.nodes;
		var force = d3.layout.force()
		    .nodes(nodes)
		    .links(dataset.edges)
		    .size([w, h])
		    .linkDistance(lineSizeScale)
		    .charge(-300)
		    .on("tick", tick)
		    .start();

		var svg = d3.select("#bubble-tab").append("svg:svg")
		    .attr("width", w)
		    .attr("height", h);

		// Per-type markers, as they don't inherit styles.
		svg.append("svg:defs").selectAll("marker")
		    .data(["suit", "licensing", "resolved"])
		    .enter().append("svg:marker")
		    .attr("id", String)
		    .attr("viewBox", "0 -5 10 10")
		    .attr("refX", 1.5)
		    .attr("refY", -1.5)
		    .attr("markerWidth", 6)
		    .attr("markerHeight", 6)
		    .attr("orient", "auto")
		    .append("svg:path")
		    .attr("d", "M0,-5L10,0L0,5");

		var path = svg.append("svg:g").selectAll("path.link")
		    .data(force.links())
		    .enter().append("svg:path")
		    .attr("class", function (d) {
		    	if(d.source.index == 0){
		    		return "link from"; 
		    	}
		    	else{
		    		return "link to";
		    	}
			})
			.attr("id", function (d) {
				if(d.source.index == 0){
		    		return "from-edge-"+d.target.index; 
		    	}
		    	else{
		    		return "to-edge-"+d.source.index;
		    	}
			})
			.style("stroke-width", function(d) { 
		    	return 3*Math.min(d.weight, 90); // Change line size
		    })
		    .on("mouseover", function(d) {
		    	var id;
		    	if(d.source.index == 0){
		    		id = "#from-edge-"+d.target.index; 
		    	}
		    	else{
		    		id = "#to-edge-"+d.source.index;
		    	}
		    	$(id).css("stroke-opacity", "1");
		    })
		    .on("mouseout", function(d) {
		    	var id;
		    	if(d.source.index == 0){
		    		id = "#from-edge-"+d.target.index; 
		    	}
		    	else{
		    		id = "#to-edge-"+d.source.index;
		    	}
		    	$(id).css("stroke-opacity", "0.5");
		    });

		    path.append("svg:title")
		    .text(function(d) {
		    	if(d.source.index == 0) {
		    		return "Paid "+dataset.nodes[d.target.index].name+" "+ d.weight +" times.";
		    	} else {
		    		return "Paid by "+dataset.nodes[d.source.index].name+" "+ d.weight +" times.";
		    	}
		    });

		var markerPath = svg.append("svg:g").selectAll("path.marker")
		    .data(force.links())
		    .enter().append("svg:path")
		    .attr("class", function (d) {
		    	if(d.source.index == 0){
		    		return "marker_only from"; 
		    	}
		    	else{
		    		return "marker_only to";
		    	}
			})
		    .style("stroke-width", function(d) { 
		    	return 3*Math.min(d.weight, 90); // Change line size
		    });


		var defs = svg.append("defs").attr("id", "imgdefs");

		var patterns = d3.select("#imgdefs").selectAll("pattern")
							.data(force.nodes())
							.enter().append("pattern")
	                        .attr("id", function(d, idx) {
	                        	return "profilePicPattern" + idx;
	                        })
	                        .attr("height", 1)
	                        .attr("width", 1)
	                        .attr("x", "0")
	                        .attr("y", "0")



	    var pictureSizeScale = 18; // Change scale (linear scale)
	    
	    for(var i = 0; i < patterns[0].length; i++) {
	    	var d = force.nodes()[i];
	    	d3.select(patterns[0][i]).append("image")
	     	.attr("x", 0)
	     	.attr("y", 0)
	     	.attr("height", 10 + pictureSizeScale * Math.min(Math.sqrt(d.amt), 15)) // Change circle size
	     	.attr("width", 10 + pictureSizeScale * Math.min(Math.sqrt(d.amt), 15)) // Change circle size
	     	.attr("preserveAspectRatio", "none")
	     	.attr("xlink:href", d.picture);
	    }

		var circle = svg.append("svg:g").selectAll("circle")
		    .data(force.nodes())
		    .enter().append("svg:g")
		    .call(force.drag)
		    .append("circle")
		    .attr("r", function(d) {
		    	return (10+ Math.min(Math.sqrt(d.amt), 15) * pictureSizeScale)/2; // Change circle size
		    })
		    .attr("fill", function(d, idx) {
		    	return "url(#profilePicPattern"+idx+")";
		    })
		    .attr("class", "peopleCircle")
		    .on("mouseover", function(d) {
		    	$('#from-edge-'+d.index).css("stroke-opacity", "1");
		    	$('#to-edge-'+d.index).css("stroke-opacity", "1");
		    })
		    .on("mouseout", function(d) {
		    	$('#from-edge-'+d.index).css("stroke-opacity", "0.5");
		    	$('#to-edge-'+d.index).css("stroke-opacity", "0.5");
		    });

		circle.append("svg:title")
		    .text(function(d) {
		    	return d.amt+" interactions with "+d.name;
		    });

		var text = svg.append("svg:g").selectAll("g")
		    .data(force.nodes())
		    .enter().append("svg:g");

		// A copy of the text with a thick white stroke for legibility.
		text.append("svg:text")
		    .attr("x", 8)
		    .attr("y", ".31em")
		    .attr("class", "shadow")
		    .text(function (d) {
		    return d.name;
		});

		text.append("svg:text")
		    .attr("x", 8)
		    .attr("y", ".31em")
		    .text(function (d) {
		    return d.name;
		});

		// Use elliptical arc path segments to doubly-encode directionality (thanks to stack overflow)
		function tick() {

		    path.attr("d", function (d) {
		        var dx = d.target.x - d.source.x,
		            dy = d.target.y - d.source.y,
		            dr = Math.sqrt(dx * dx + dy * dy);
		        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
		    });

		    markerPath.attr("d", function (d) {
		        var dx = d.target.x - d.source.x,
		            dy = d.target.y - d.source.y,
		            dr = Math.sqrt(dx * dx + dy * dy);

		        var endX = (d.target.x + d.source.x) / 2;
		        var endY = (d.target.y + d.source.y) / 2;
		        var len = dr - ((dr / 2) * Math.sqrt(3));
		        endX = endX + (dy * len / dr);
		        endY = endY + (-dx * len / dr);

		        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + endX + "," + endY;
		    });

		    circle.attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });

		    text.attr("transform", function (d) {
		        return "translate(" + d.x + "," + d.y + ")";
		    });
		}
	}




