function show_error(msg) {
	$('#global_error').text(msg)
}

function request_failed(jqXHR, textStatus, errorThrown) {
	msg = ''
	if (textStatus == "timeout") {
		msg = 'The request timed out. Perhaps the server has shut down or is hung.'
	} else if (textStatus == "error") {
		msg = 'The request received an error.'
		if (jqXHR.status == 0)
			msg = msg + ' Perhaps the server has shut down.'
	} else if (msg == 'abort') {
		msg = 'The request aborted.'
	} else if (msg == 'parsererror') {
		msg = 'The request experienced a parser error.'
	} else {
		msg = 'The request had an unknown error "' + textStatus + '."'
	}

	if (errorThrown.length > 0) {
		msg = msg + ' The HTTP reply returned ' + errorThrown
	}	
	show_error(msg)
}

/* Runs a GET request, parses the JSON, and invokes the handler for each element in it. The JSON result is assumed to be an array. */
function run_get_request_with_bulk_handler(url, handler) {
	$.ajax({
		  type: "GET",
		  url: url,
		  dataType: "text",
		  success: function(data){
			$('#global_error').text('')
			handler($.parseJSON(data))
		  },
		  error: request_failed
		})
}

function run_get_request(url, handler) {
	run_get_request_with_bulk_handler(url, function(json_contents){
		$.each(json_contents, function(idx, contents){
			handler(contents)
		})
	})
}


/* As above but with POST request. */
function run_post_request(url, data_map, handler) {
	$.ajax({
		  type: "POST",
		  url: url,
		  dataType: "text",
		  data: data_map,
		  success: function(data){
			$('#global_error').text('')
			$.each($.parseJSON(data), function(idx, contents) {
				handler(contents)
			})
		  },
		  error: request_failed
		})
}

function rgb_to_hsl(r, g, b){	
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function hsl_to_rgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1.0/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0/3);
    }

    return [r * 255, g * 255, b * 255]
}

/* Given an RGB color as a hex string, like FF0033, convert to HSL, apply the function to adjust its lightness, then return the new color as an RGB string */
function adjust_lightness(color_str, func) {
	/* Hack to handle for example F00 */
	if (color_str.length == 3) {
		color_str = color_str[0] + color_str[0] + color_str[1] + color_str[1] + color_str[2] + color_str[2]
	}

	rgb = parseInt(color_str, 16)
	r = (rgb >> 16) & 0xFF
	g = (rgb >> 8) & 0xFF
	b = (rgb >> 0) & 0xFF
	
	hsl = rgb_to_hsl(r, g, b)
	new_lightness = func(hsl[2])
	function to_int_str(val) {
		str = Math.round(val).toString(16)
		while (str.length < 2)
			str = '0' + str
		return str
	}
	
	new_rgb = hsl_to_rgb(hsl[0], hsl[1], new_lightness)
	return to_int_str(new_rgb[0]) + to_int_str(new_rgb[1]) + to_int_str(new_rgb[2])
}

/* Given a color, compute the master text color for it, by giving it a minimum brightness */
function master_color_for_color(color_str) {
	return adjust_lightness(color_str, function(lightness){
		if (lightness < .33) {
			lightness = .33
		}
		return lightness
	})
}

/* Update prompt_demo_text with the given text, adjusting the font */
function set_prompt_demo_text(txt, font_size) {
	/* Set the font size and the text */
	var prompt_demo_text = $('.prompt_demo_text')
	prompt_demo_text.css('font-size', font_size)
	prompt_demo_text.html(txt)
}


function switch_tab(new_tab) {
	
	var submodel = false;
	if (new_tab == 'tab_colors') {
		submodel = gModel.color_picker();
	} else if (new_tab == 'tab_prompt') {
	} else if (new_tab == 'tab_functions') {
		submodel = gModel.funcs();
	} else if (new_tab == 'tab_variables') {
		submodel = gModel.vars();
	} else if (new_tab == 'tab_history') {
		submodel = gModel.history();
	} else {
		alert("Unknown tab");
	}
	
	if (submodel) {
		gModel.clear();
		gModel.select_model_name(submodel.name)
		submodel.load();
	}
	
	return;

	/* Switch selected tab */
	$(".selected_tab").removeClass("selected_tab")
	$('#' + new_tab).addClass("selected_tab")
	
	/* Empty master element */
	$('#master').empty()
	
	/* Unselect some things */
	$(".colorpicker_cell_selected").removeClass('colorpicker_cell_selected')
	
	/* Hide some things */
	$('#master_detail_table').hide()
	$('#detail_colorpicker').hide()
	$('#detail_prompt').hide()
	$('#detail_function').hide()
	$('#data_table').hide()
	$('#table_filter_container').hide()
	$('#data_table').empty()
	
	/* Determine if we will want to show the data table (and associated filter box) */
	var wants_data_table = false
	
	/* Load something new */
	if (new_tab == 'tab_colors') {
		/* Keep track of whether this is the first element */
		var first = true
		run_get_request('/colors/', function(key_and_values){
			/* Result is name, description, value */
			var key = key_and_values[0]
			var description = key_and_values[1]
			var style = new Style(key_and_values[2])
			style_map[key] = style
			elem = create_master_element(key, description, style.color, '', select_color_master_element)
			if (first) {
				/* It's the first element, so select it, so something gets selected */
				select_color_master_element(elem)
				first = false
			}
		})
		$('#detail_colorpicker').show()
		$('#master_detail_table').show()
		wants_data_table = false
	} else if (new_tab == 'tab_prompt') {
		/* Get rid of all sample prompts */
		sample_prompts.length = 0
		/* Color the first one blue */
		var first = true;
		run_get_request('/sample_prompts/', function(sample_prompt){
			var name = sample_prompt['name']
			sample_prompts[name] = sample_prompt
			var color = first ? '66F' : 'AAA'
			var func = first ? select_current_prompt_master_element :  select_sample_prompt_master_element;
			var elem = create_master_element(name, false/* description */, color, '13pt', func)
			if (first) {
				elem.children('.master_element_text').css('border-bottom-color', color)
				select_current_prompt_master_element(elem)
			}
			first = false;
		})
		$('#detail_prompt').show()
		$('#master_detail_table').show()
	} else if (new_tab == 'tab_functions') {
		/* Keep track of whether this is the first element */
		var first = true
		run_get_request('/functions/', function(contents){
			var elem = create_master_element(contents, false/* description */, 'AAAAAA', '11pt', select_function_master_element)
			if (first) {
				/* It's the first element, so select it, so something gets selected */
				select_function_master_element(elem)
				first = false
			}
		})
		$('#detail_function').show()
		$('#master_detail_table').show()
		wants_data_table = false
	} else if (new_tab == 'tab_variables') {
		run_get_request_with_bulk_handler('/variables/', function(json_contents){
			var rows = new Array()
			for (var i = 0; i < json_contents.length; i++) {
				var contents = json_contents[i]
				var name = contents[0]
				var value = contents[1]
				var flags = contents[2]
				var row = create_data_table_element_text([name, value], false)
				rows[i] = row
			}
			$('#data_table').append(rows.join(''))
		})
		wants_data_table = true
	} else if (new_tab == 'tab_history') {
		// Clear the history map
		history_element_map.length = 0
		run_get_request_with_bulk_handler('/history/', function(json_contents){
			start = new Date().getTime()
			var rows = new Array()
			for (var i = 0; i < json_contents.length; i++) {
				var history_text = json_contents[i]
				rows[i] = create_data_table_element_text([history_text], true)
				history_element_map[last_global_element_identifier] = history_text
			}
			$('#data_table').append(rows.join(''))
			end = new Date().getTime()				
			//alert(rows.length + " rows in " + (end - start) + " msec")
		})
		wants_data_table = true
	} else {
		alert("Unknown tab");
	}
	
	/* Show or hide the data table and its search field */
	if (wants_data_table) {
		$('#data_table').show()
		$('#table_filter_container').show()
	} else {
		$('#data_table').hide()
		$('#table_filter_container').hide()	
	}
		
	return false
}

function current_master_element_name() {
	/* Get the name of the current color variable, like 'autosuggestion' */
	var elems = $('.selected_master_elem')
	if (elems.length == 0) {
		return ''
	}
	elem = elems[0]
	if (elem.id.indexOf('master_')  != 0) {
		show_error('Unknown master variable')
		return ''
	}
	return elem.id.substring(7)
}

function is_foreground() {
	/* Returns true if the selected tab is foreground, false if it's background */
	who = $('.colorpicker_target_selected')
	if (who.length == 0) {
		show_error('Not sure if we are in foreground or background')
		return false
	}
	return who[0].id == 'foreground'
}

function current_style() {
	/* Returns the style object corresponding to the current color variable */
	return style_map[current_master_element_name()]
}

function reflect_style() {
	/* Unselect everything */	
	$('.colorpicker_cell_selected').removeClass('colorpicker_cell_selected')
	$('.modifier_cell_selected').removeClass('modifier_cell_selected')
	$('.master_element_no_border').removeClass('master_element_no_border')
	
	/* Now update the color picker with the current style (if we have one) */
	style = current_style()
	if (style) {
	
		/* Use this function to make a color that contrasts well with the given color */
		var adjust = .5
		function compute_constrast(lightness){
			var new_lightness = lightness + adjust
			if (new_lightness > 1.0 || new_lightness < 0.0) {
				new_lightness -= 2 * adjust
			}
			return new_lightness
		}
	
		color = is_foreground() ? style.color : style.background_color
		var color_cell = $('#color_' + color)
		color_cell.addClass('colorpicker_cell_selected')
		color_cell.css('border-color', adjust_lightness(is_foreground() ? style.color : style.background_color, compute_constrast))
		
		if (style.underline) {
			$('#modifier_underline').addClass('modifier_cell_selected')
		}
		
		/* In the master list, ensure the color is visible against the dark background. If we're deselecting, use COLOR_NORMAL */
		master_color = style.color ? master_color_for_color(style.color) : COLOR_NORMAL
		//$('.selected_master_elem').children('.master_element_text').css({'color': master_color, 'border-bottom-color': master_color})
		
		var selected_elem = $('.selected_master_elem');
		var desc_elems = selected_elem.children('.master_element_description')
		selected_elem.css({'color': master_color})
		selected_elem.children().css({'border-bottom-color': master_color})
		if (desc_elems.length) {
			/* We have a description element, so hide the bottom border of the master element */
			selected_elem.children('.master_element_text').addClass('master_element_no_border')
		}
	}
}

function cleanup_fish_function(contents) {
	/* Replace leading tabs and groups of four spaces at the beginning of a line with two spaces. */
	lines = contents.split('\n')
	rx = /^[\t ]+/
	for (var i=0; i < lines.length; i++) {
		line = lines[i]
		/* Get leading tabs and spaces */
		whitespace_arr = rx.exec(line)
		if (whitespace_arr) {
			/* Replace four spaces with two spaces, and tabs with two spaces */
			var whitespace = whitespace_arr[0]
			new_whitespace = whitespace.replace(/(    )|(\t)/g, '  ')
			lines[i] = new_whitespace + line.slice(whitespace.length)
		}
	}
	return lines.join('\n')
}

function select_master_element(elem) {
	$('.selected_master_elem').removeClass('selected_master_elem')
	$(elem).addClass('selected_master_elem')
}

function select_color_master_element(elem) {
	select_master_element(elem)
	
	/* This changed the current style; reflect that */
	reflect_style()
}

function select_function_master_element(elem) {
	select_master_element(elem)
	
	run_post_request('/get_function/', {
		what: current_master_element_name()
	}, function(contents){
		/* Replace leading tabs and groups of four spaces at the beginning of a line with two spaces. */
		munged_contents = cleanup_fish_function(contents)
		$('#detail_function').text(munged_contents)
	});
}

var sample_prompts = new Array();

function select_sample_prompt_master_element(elem) {
	$('.prompt_save_button').show()
	select_master_element(elem)
	var name = current_master_element_name()
	sample_prompt = sample_prompts[name]
	run_post_request('/get_sample_prompt/', {
		what: sample_prompt['function']
	}, function(keys_and_values){
		var prompt_func = keys_and_values['function']
		var prompt_demo = keys_and_values['demo']
		var prompt_font_size = keys_and_values['font_size']
		set_prompt_demo_text(prompt_demo, prompt_font_size)
		//$('.prompt_demo_text').html(prompt_demo)
		$('.prompt_function_text').text(cleanup_fish_function(prompt_func))
	})
}

function select_current_prompt_master_element(elem) {
	$('.prompt_save_button').hide()
	select_master_element(elem)
	run_get_request_with_bulk_handler('/current_prompt/', function(keys_and_values){
		var prompt_func = keys_and_values['function']
		var prompt_demo = keys_and_values['demo']
		var prompt_font_size = keys_and_values['font_size']
		set_prompt_demo_text(prompt_demo, prompt_font_size)
		$('.prompt_function_text').text(cleanup_fish_function(prompt_func))
	})
}

/* Applies the current prompt */
function save_current_prompt() {
	var name = current_master_element_name()
	var sample_prompt = sample_prompts[name]
	run_post_request('/set_prompt/', {
		what: sample_prompt['function']
	}, function(contents){
		if (contents == "OK") {
			select_current_prompt_master_element($('#master_Current'))
		} else {
			show_error(contents)
		}
	})
}

function post_style_to_server() {
	style = current_style()
	if (! style)
		return
	
	run_post_request('/set_color/', {
		what: current_master_element_name(),
		color: style.color,
		background_color: style.background_color,
		bold: style.bold,
		underline: style.underline
	}, function(contents){
		
	})
}

function picked_color_cell(cell) {
	
	/* Get the color to set */
	if (cell.id.indexOf('color_') != 0) {
		show_error('Unknown cell')
		return
	}
	color = cell.id.substring(6)
	
	/* Determine whether we are going to select or unselect this cell */
	var deselect = $(cell).hasClass('colorpicker_cell_selected')

	/* Get the current style */
	style = current_style()
	if (! style)
		return
	
	/* Change the color */
	if (is_foreground()) {
		style.color = deselect ? '' : color
	} else {
		style.background_color = deselect ? '' : color
	}
	
	/* Show our changes */
	reflect_style()

	/* Tell the server */
	post_style_to_server()
}

function picked_modifier(cell) {
	style = current_style()
	if (! style)
		return
	if (cell.id == 'modifier_underline') {
		style.underline = ! style.underline
	} else if (cell.id == 'modifier_bold') {
		style.bold = ! style.bold
	} else {
		show_error('Unknown cell')
	}
	
	reflect_style()
	post_style_to_server()
}

function picked_colorpicker_target(tab) {
	/* The function that gets called when a tab is selected */
	$('.colorpicker_target_selected').removeClass('colorpicker_target_selected')
	$(tab).addClass('colorpicker_target_selected')
	reflect_style()
}

/* Given a color name, like 'normal' or 'red' or 'FF00F0', return an RGB color string (or empty string) */
function interpret_color(str) {
	str = str.toLowerCase()
	if (str == 'black') return '000000'
	if (str == 'red') return 'FF0000'
	if (str == 'green') return '00FF00'
	if (str == 'brown') return '725000'
	if (str == 'yellow') return 'FFFF00'
	if (str == 'blue') return '0000FF'
	if (str == 'magenta') return 'FF00FF'
	if (str == 'purple') return 'FF00FF'
	if (str == 'cyan') return '00FFFF'
	if (str == 'white') return 'FFFFFF'
	if (str == 'normal') return ''
	return str
}

/* Class representing a color style */
function Style(stuff) {
	this.color = interpret_color(stuff[0])
	this.background_color = interpret_color(stuff[1])
	this.bold = stuff[2]
	this.underline = stuff[3]
}

var style_map = new Array();

/* The first index here corresponds to value 16 */
term256_colors = [ //247
"ffd7d7",
"d7afaf",
"af8787",
"875f5f",
"5f0000",
"870000",
"af0000",
"d70000",
"ff0000",
"ff5f5f",
"d75f5f",
"d78787",
"ff8787",
"ffafaf",
"ffaf87",
"ffaf5f",
"ffaf00",
"ff875f",
"ff8700",
"ff5f00",
"d75f00",
"af5f5f",
"af5f00",
"d78700",
"d7875f",
"af875f",
"af8700",
"875f00",
"d7af87",
"ffd7af",
"ffd787",
"ffd75f",
"d7af00",
"d7af5f",
"ffd700",
"ffff5f",
"ffff00",
"ffff87",
"ffffaf",
"ffffd7",
"d7ff00",
"afd75f",
"d7d700",
"d7d787",
"d7d7af",
"afaf87",
"87875f",
"5f5f00",
"878700",
"afaf00",
"afaf5f",
"d7d75f",
"d7ff5f",
"d7ff87",
"87ff00",
"afff00",
"afff5f",
"afd700",
"87d700",
"87af00",
"5f8700",
"87af5f",
"5faf00",
"afd787",
"d7ffd7",
"d7ffaf",
"afffaf",
"afff87",
"5fff00",
"5fd700",
"87d75f",
"5fd75f",
"87ff5f",
"5fff5f",
"87ff87",
"afd7af",
"87d787",
"87d7af",
"87af87",
"5f875f",
"5faf5f",
"005f00",
"008700",
"00af00",
"00d700",
"00ff00",
"00ff5f",
"5fff87",
"00ff87",
"87ffaf",
"afffd7",
"5fd787",
"00d75f",
"5faf87",
"00af5f",
"5fffaf",
"00ffaf",
"5fd7af",
"00d787",
"00875f",
"00af87",
"00d7af",
"5fffd7",
"87ffd7",
"00ffd7",
"d7ffff",
"afd7d7",
"87afaf",
"5f8787",
"5fafaf",
"87d7d7",
"5fd7d7",
"5fffff",
"00ffff",
"87ffff",
"afffff",
"00d7d7",
"00d7ff",
"5fd7ff",
"5fafd7",
"00afd7",
"00afff",
"0087af",
"00afaf",
"008787",
"005f5f",
"005f87",
"0087d7",
"0087ff",
"5fafff",
"87afff",
"5f87d7",
"5f87ff",
"005fd7",
"005fff",
"005faf",
"5f87af",
"87afd7",
"afd7ff",
"87d7ff",
"d7d7ff",
"afafd7",
"8787af",
"afafff",
"8787d7",
"8787ff",
"5f5fff",
"5f5fd7",
"5f5faf",
"5f5f87",
"00005f",
"000087",
"0000af",
"0000d7",
"0000ff",
"5f00ff",
"5f00d7",
"5f00af",
"5f0087",
"8700af",
"8700d7",
"8700ff",
"af00ff",
"af00d7",
"d700ff",
"d75fff",
"d787ff",
"ffafd7",
"ffafff",
"ffd7ff",
"d7afff",
"d7afd7",
"af87af",
"af87d7",
"af87ff",
"875fd7",
"875faf",
"875fff",
"af5fff",
"af5fd7",
"af5faf",
"d75fd7",
"d787d7",
"ff87ff",
"ff5fff",
"ff5fd7",
"ff00ff",
"ff00af",
"ff00d7",
"d700af",
"d700d7",
"af00af",
"870087",
"5f005f",
"87005f",
"af005f",
"af0087",
"d70087",
"d7005f",
"ff0087",
"ff005f",
"ff5f87",
"d75f87",
"d75faf",
"ff5faf",
"ff87af",
"ff87d7",
"d787af",
"af5f87",
"875f87",
"000000",
"080808",
"121212",
"1c1c1c",
"262626",
"303030",
"3a3a3a",
"444444",
"4e4e4e",
"585858",
"5f5f5f",
"626262",
"6c6c6c",
"767676",
"808080",
"878787",
"8a8a8a",
"949494",
"9e9e9e",
"a8a8a8",
"afafaf",
"b2b2b2",
"bcbcbc",
"c6c6c6",
"d0d0d0",
"d7d7d7",
"dadada",
"e4e4e4",
"eeeeee",
"ffffff",
]

var items_per_row = 15
var show_labels = 0

var COLOR_NORMAL = 'CCC'

/* Adds a new element to master */
function create_master_element(contents, description_or_false, color, font_size, click_handler) {
	/* In the master list, ensure the color is visible against the dark background */
	var master_color = color ? master_color_for_color(color) : COLOR_NORMAL
	var master_style = 'color: #' + master_color
	var master_children_style =  'border-bottom-color: #' + master_color
	var text_style = ''
	
	if (font_size.length > 0) {
		text_style += 'font-size: ' + font_size + ';'
	}
	
	if (contents.length >= 20) {
		text_style += 'letter-spacing:-2px;'
	}
	
    elem = $('<div/>', {
      class: 'master_element',
      id: 'master_' + contents,
      style: master_style,
      click: function(){
      	click_handler(this)
      }
    }).append(
        $("<span/>", {
        class: 'master_element_text',
        style: text_style,
        text: contents,
        })
    )
    
    /* Append description if we have one */
    if (description_or_false) {
    	/* Newline between label and description */
    	elem.append($('<br/>'))
    	elem.append(
    		$('<span/>', {
				class: 'master_element_description',
				text: description_or_false
			})
    	)
    }
    
    /* Update border color of the master element's children */
    elem.children().css(master_children_style)
    
    elem.appendTo('#master')
    return elem
}

/* Toggle the no_overflow class */
function toggle_overflow(who) {
	$(who).toggleClass('no_overflow')
}

function escape_HTML(foo) {
    return foo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Given the image, walk up to the table */
function tell_fish_to_delete_element(idx) {
	var row_elem = $('#data_table_row_' + idx)
	var txt = history_element_map[idx]
	run_post_request('/delete_history_item/', {
		what: txt
	}, function(contents){
		if (contents == "OK") {
			row_elem.remove();
		} else {
			show_error(contents)
		}
	});
}


/* Creates a new row in the data table */
var last_global_element_identifier = 0
var history_element_map = new Array();

function create_data_table_element_text(contents_list, show_delete_button) {
	var element_identifier = (++last_global_element_identifier).toString()
	lines = new Array()
	var result_str = '<tr class="data_table_row" id="data_table_row_' + element_identifier + '">'
	for (idx = 0; idx < contents_list.length; idx++) {
		/* If we have more than one, then align the first one right, subsequent ones left */
		if (idx == 0 && contents_list.length > 1) {
			result_str += '<td class="data_table_cell no_overflow" style="text-align: right; padding-right: 30px;">'
		} else {
			result_str += '<td class="data_table_cell no_overflow" style="text-align: left; padding-right: 30px;" onClick:"toggle_overflow(this)">'			
		}
		text_list = contents_list[idx].split("\n")
		for (j=0; j < text_list.length; j++) {
			if (j > 0) result_str += '<br>'
			result_str += escape_HTML(text_list[j]);
		}
		result_str += '</td>'
	}
	if (show_delete_button) {
		result_str += '<td class="data_table_cell" style="text-align: right; width: 25px"><a onClick="tell_fish_to_delete_element(' + element_identifier + ')"><img class="delete_icon" src="delete.png"></a></td>'
	}
	result_str += '</tr>'
	return result_str
}

/* Put stuff in colorpicker_term256 */
function populate_colorpicker_term256() {
	$('#colorpicker_term256').empty()
	var idx
	for (idx = 0; idx < term256_colors.length; idx += items_per_row) {
		var row = $('<tr>', {
			class: 'colorpicker_term256_row'
		})
		
		for (var subidx = 0; subidx < items_per_row && idx  + subidx < term256_colors.length; subidx++) {
			cell_style = 'background-color: #' + term256_colors[idx + subidx]
			var cell = $('<td>', {
				class: 'colorpicker_term256_cell',
				style: cell_style,
				id: 'color_' + term256_colors[idx + subidx],
				text: show_labels ? String(subidx + idx + 223) : '',
				onClick: 'picked_color_cell(this)'
			})
			
			/* For reasons I don't understand, this makes the selected cell border appear in Firefox */
			cell.append($('<div>', {
				style: 'width: 100%; height: 100%'
			}))
			row.append(cell)
		}
		
		$('#colorpicker_term256').append(row)
	}	
}

/* Update the filter text box */
function update_table_filter_text_box(allow_transient_message) {
	var box = $('#table_filter_text_box')
	var has_transient = box.hasClass('text_box_transient')
	if (! allow_transient_message && has_transient) {
		box.val('')
		box.removeClass('text_box_transient')
		has_transient = false
	} else if (allow_transient_message && ! has_transient && ! box.val().length) {
		box.val('Filter')
		box.addClass('text_box_transient')
		has_transient = true
	}
	
	var search_text = box.val()
	if (has_transient || search_text.length == 0) {
		/* Unfilter all */
		$('.data_table_row_filtered').removeClass('data_table_row_filtered')
	} else {
		/* Helper function to return whether a node (or its descendants) matches the given text */
		function match_text(node) {
			if (node.nodeType == 3) {
				return node.nodeValue.indexOf(search_text) != -1
			} else {
				for (var i = 0, len = node.childNodes.length; i < len; ++i) {
					if (match_text(node.childNodes[i])) {
						return true;
					}
				}
			}
			return false
		}
	
		$('.data_table_row').each(function(idx) {
			var row = $(this)
			var is_hidden = row.hasClass('data_table_row_filtered')
			var should_be_hidden = ! match_text(this)
			if (is_hidden && ! should_be_hidden) {
				row.removeClass('data_table_row_filtered')
			} else if (! is_hidden && should_be_hidden) {
				row.addClass('data_table_row_filtered')
			}
		})
	}
	
	return true
}

if (0) $(document).ready(function() {
	populate_colorpicker_term256()
	var tab_name
	switch (window.location.hash) {
		case '#functions':
			tab_name = 'tab_functions'
			break
		case '#variables':
			tab_name = 'tab_variables'
			break
		case '#history':
			tab_name = 'tab_history'
			break
		case '#prompt':
			tab_name = 'tab_prompt'
			break
		case '#colors':
		default:
			tab_name = 'tab_colors'
			break;
	}
	switch_tab(tab_name)
})

function FishConfigModel() {
	
	self.selectedTab = ko.observable('tab_colors');
	self.selectTab = function(tab) { location.hash = folder };
}


function FishFunctionsModel() {
	var self = this;
	
	self.name = 'functions';
	self.functions = ko.observableArray();
	self.selected_function_name = ko.observable('');
	self.function_text = ko.observable('');
	
	self.select_function = function(func_obj){
		/* Change which function is selected */
		self.selected_function_name(func_obj.name);
		
		/* Clear existing text */
		self.function_text('');
		
		run_post_request('/get_function/', {
			what: func_obj.name
		}, function(contents){
			/* Replace leading tabs and groups of four spaces at the beginning of a line with two spaces. */
			var munged_contents = cleanup_fish_function(contents)
			self.function_text(munged_contents)
		});
	};
	
	self.load = function(){
		run_get_request_with_bulk_handler('/functions/', function(json_contents){
			self.functions(json_contents);
			
			/* Select the first function if we don't have one selected already */
			if (self.functions() && ! self.selected_function_name())
			{
				self.select_function(self.functions()[0])
			}
		});
	};
	
	self.clear = function(){
		self.functions([]);
		self.selected_function_name('');
		self.function_text('');
	};
}

function FishVariablesModel() {
	var self = this;
	self.name = 'variables';
	
	self.variables = ko.observableArray();

	self.load = function(){
		run_get_request_with_bulk_handler('/variables/', function(json_contents){
			var i;
			for (i=0; i < json_contents.length; i++)
			{
				json_contents[i].index = i;
			}
			self.variables(json_contents);
		});
	};
	
	/* Toggle whether the variable is truncated. The value is not observable so we have to replace it. It's initially undefined. */
	self.toggle_truncation = function(orig){
		var copy = orig.slice(0);
		copy.no_truncate = ! orig.no_truncate;
		self.variables.replace(orig, copy);
	};
	
	self.clear = function(){
		self.variables([]);
	};
}

function FishHistoryFilterModel() {
	var self = this;
	self.text = ko.observable('');
	self.is_transient = ko.observable(false);
	self.focused = ko.observable(false);
	
	self.update_box_transient_state = function(box){
		if (! self.focused() && self.text().length == 0)
		{
			self.is_transient(true);
			self.text('Filter');
		}
		else if (self.is_transient())
		{
			self.is_transient(false);
			self.text('');
		}
		return false;
		var box = $('#table_filter_text_box')
		var has_transient = box.hasClass('text_box_transient')
		if (! allow_transient_message && has_transient) {
			box.val('')
			box.removeClass('text_box_transient')
			has_transient = false
		} else if (allow_transient_message && ! has_transient && ! box.val().length) {
			box.val('Filter')
			box.addClass('text_box_transient')
			has_transient = true
		}
		
		var search_text = box.val()
		if (has_transient || search_text.length == 0) {
			/* Unfilter all */
			$('.data_table_row_filtered').removeClass('data_table_row_filtered')
		} else {
			/* Helper function to return whether a node (or its descendants) matches the given text */
			function match_text(node) {
				if (node.nodeType == 3) {
					return node.nodeValue.indexOf(search_text) != -1
				} else {
					for (var i = 0, len = node.childNodes.length; i < len; ++i) {
						if (match_text(node.childNodes[i])) {
							return true;
						}
					}
				}
				return false
			}
		
			$('.data_table_row').each(function(idx) {
				var row = $(this)
				var is_hidden = row.hasClass('data_table_row_filtered')
				var should_be_hidden = ! match_text(this)
				if (is_hidden && ! should_be_hidden) {
					row.removeClass('data_table_row_filtered')
				} else if (! is_hidden && should_be_hidden) {
					row.addClass('data_table_row_filtered')
				}
			})
		}
		
		return true
	}
	
	self.load = function(){
		self.text('Filter');
		self.is_transient(true);
	}
	
	self.filter_text = function(){
		return self.is_transient() ? '' : self.text();
	}
}

/* returns whether two arrays contain equal objects */
function equal_arrays(a, b) {
	if (a === b) return true;
	var a_len = a.length;
	if (a_len != b.length) return false;
	for (var i=0; i < a_len; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function FishHistoryModel() {
	var self = this;
	self.name = 'history';
	self.loading_text = ko.observable('');
	
	self.history_filter = ko.observable(new FishHistoryFilterModel())
	
	self.remaining_to_load = new Array();
	self.loaded_history = new Array();
	self.history = ko.observableArray();
	
	/* Whether the user has typed something and we are coalescing updates */
	self.text_field_coalescing = false;
	
	self.load = function(){
		self.history_filter().load()
		self.loading_text('Loading…');
		run_get_request_with_bulk_handler('/history/', function(json_contents){
			//console.log(json_contents);
			var start = new Date().getTime();
			var history_objs = new Array();
			var i;
			for (i=0; i < json_contents.length; i++)
			{
				// We are given text; we store it as a one element array so that we can make a 'copy' easily for truncation
				var history_obj = [json_contents[i]];
				history_obj.identifier = i
				history_objs.push(history_obj)				
			}
			self.remaining_to_load = self.remaining_to_load.concat(history_objs);
			self.load_some_history();
		});
	};
	
	self.update_filtered_history = function(){
		var filtered_history;
		var filter_txt = self.history_filter().filter_text();
		if (! filter_txt) {
			filtered_history = self.loaded_history;
		} else {
			filtered_history = ko.utils.arrayFilter(self.loaded_history, function(history_obj){
				var txt = history_obj[0];
				return txt.indexOf(filter_txt) >= 0;
			});
		}
		/* It's surprising that knockout doesn't seem to do this comparison */
		var current = self.history();
		if (! equal_arrays(current, filtered_history)) {
			self.history(filtered_history);
		}
	}
	
	self.load_some_history = function(){
		/* Clear if we're done loading */
		if (self.remaining_to_load.length == 0) {
			self.loading_text('');
			return;
		}
			
		/* Always take from the beginning */
		var amount_to_take = Math.min(100, self.remaining_to_load.length);
		var to_load = self.remaining_to_load.splice(0, amount_to_take);
		for (var i=0; i < amount_to_take; i++) {
			self.loaded_history.push(to_load[i]);
		}
		self.update_filtered_history();
		
		/* Trigger a timer if we aren't done */
		var so_far = self.loaded_history.length, total = self.loaded_history.length + self.remaining_to_load.length;
		self.loading_text('Loaded ' + so_far + ' / ' + total);
		window.setTimeout(self.load_some_history, .1 * 1000.); //10 times a second
	};
	
	/* Toggle whether the history item is truncated. The value is not observable so we have to replace it. */
	self.toggle_truncation = function(orig){
		var copy = orig.slice(0);
		copy.no_truncate = ! orig.no_truncate;
		self.history.replace(orig, copy);
	};
	
	self.delete_history_item = function(orig){
		var txt = orig[0];
		run_post_request('/delete_history_item/', {
			what: txt
		}, function(contents){
			if (contents == "OK") {
				self.history.remove(orig);
			} else {
				show_error(contents)
			}
		});
	};
	
	self.clear = function(){
		self.history([]);
	};
	
	// Triggered after the text field coalescing timer fires
	self.do_coalesced_text_field_updates = function(){
		self.update_filtered_history();
		self.text_field_coalescing = false;
	}
		
	self.update_box_filter = function(data, event){
		/* knockout doesn't do a good job of updating on all text changes, so apply the text value immediately, then update our filter */
		var text_field = event.target;
		self.history_filter().text(text_field.value)
		
		if (self.text_field_coalescing) {
			/* We are coalescing, reschedule */
			window.clearTimeout(self.text_field_coalescing)
		}
		// Coalesce updates for .25 seconds
		self.text_field_coalescing = window.setTimeout(self.do_coalesced_text_field_updates, 1000 * .25);

	};
}

/* Class representing a style */
function Style(stuff) {
	this.color = interpret_color(stuff[0])
	this.background_color = interpret_color(stuff[1])
	this.bold = stuff[2]
	this.underline = stuff[3]
}

/* An object representing a single setting, i.e. 'command' = 'red' */
function FishColorSettingModel(name, style, description) {
	var self = this;
	self.style = ko.observable(style);
	
	/* Name and description are immutable */
	self.name = name;
	self.description = description;
	
	self.label_color = ko.computed(function(){
		return adjust_lightness(self.style().color, function(lightness){
			if (lightness < .33) {
				lightness = .33;
			}
			return lightness;
		})
	});
	
};

function FishColorPickerModel() {
	var self = this;
	self.name = 'color_picker';
	self.color_arrays_array = new Array();
	self.selected_setting = ko.observable(false);
	
	/* Our colors are not observable; just populate the array */
	var items_per_row = 15;
	for (var idx = 0; idx < term256_colors.length; idx += items_per_row) {
		var row = new Array();
		for (var subidx = 0; subidx < items_per_row && idx  + subidx < term256_colors.length; subidx++) {
			row.push(term256_colors[idx + subidx]);
		}
		self.color_arrays_array.push(row);
	}
	
	/* Array of FishColorSettingModel */
	self.color_settings = ko.observableArray([]);
	
	self.load = function(){
		run_get_request_with_bulk_handler('/colors/', function(json_contents){
			var settings = new Array();
			for (var i=0; i < json_contents.length; i++) {
				/* Result is name, description, value */
				var key_and_values = json_contents[i];
				var key = key_and_values[0]
				var description = key_and_values[1]
				var style = new Style(key_and_values[2])
				settings.push(new FishColorSettingModel(key, style, description));
			}
			self.color_settings(settings);
		})
	};

	
	self.clear = function(){
		self.color_settings([]);
	};
	
	self.select_setting = function(to_select){
		self.selected_setting(to_select);
	}

}

function FishModel() {
	var self = this;
	
	self.funcs = ko.observable(new FishFunctionsModel());
	self.vars = ko.observable(new FishVariablesModel());
	self.history = ko.observable(new FishHistoryModel());
	self.color_picker = ko.observable(new FishColorPickerModel());
	
	self.selected_model_name = ko.observable('');
	
	self.clear = function(){
		self.funcs().clear();
		self.vars().clear();
		self.history().clear();
		self.color_picker().clear();
	}
	
	self.select_model_name = function(which){
		self.selected_model_name(which);
	}
}

gModel = new FishModel();
ko.applyBindings(gModel);

