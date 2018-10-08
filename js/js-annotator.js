(function ( $ ) {

    $.fn.js_annotator = function( options ) {

        var s = $.extend({
            // These are the defaults.
            modes: 'edit', //preview, edit
            mode_navigation: '.mode_panel',
            annotation_data: {
                annotations:{}
            },
            settings_container: '#settings-wrap',
            selected: 'edit',
            deleteBtn: '.deleteAnnotation',
            wrapper: '.ja_ground_wrapper',
            mapper: {
                shape: 'shape',
                left: 'shape_left',
                top: 'shape_top',
                width: 'shape_width',
                height: 'shape_height',
                tooltip_title: 'tooltip_data[title]',
                tooltip_content: 'tooltip_data[content]',
                tooltip_text_color: 'tooltip_settings[text_color]',
                //tooltip_position: '',
            },
        }, options );

        var primary_s = s;
        // This is the easiest way to have default options.

        this.each(function(){
            var _this = this;
            var selectedShapeID = '';
            var mousedown = false;
            var dragging = false;
            var mouseup = false;
            var primX = '';
            var primY = '';
            var finalX = '';
            var finalY = '';
            var selectedShape = 'rect'; //rect,circle
            var tintColor = '#000000';
            var img_position = {};
            var annotation_blueprint = {
                shape: '',
                left: '',
                top: '',
                width: '',
                height: '',
                tooltip_data:{
                    title: '',
                    content: ''
                },
                tooltip_settings: {
                    text_color: '',
                    position: ''
                }
            };


            $(_this).css('position','relative').height($('img',this).height());
            $('img',_this).css('position','absolute');
            var item = $('img',_this);
            if( !$('.ja_annotation_wrapper',this).length ) {
                $(_this).prepend('<div class="ja_annotation_wrapper" style="position: absolute; top: 0; bottom: 0; right: 0;left: 0;z-index: 99999;"></div>');
            };

            //some more saved parent
            var annotation_wrapper = $('.ja_annotation_wrapper',_this);
            var base_top = getOffset($(s.wrapper)[0]).top;
            var base_left = getOffset(annotation_wrapper[0]).left;
            img_position = {
                left: base_left,
                top: base_top
            };
            //

            /**
             * Return offset
             */
            function getOffset(el) {
                const rect = el.getBoundingClientRect();
                return {
                    left: rect.left + window.scrollX,
                    top: rect.top + window.scrollY
                };
            }

            /**
             * Hex to RGB
             */
            function hexToRgb(hex) {
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            }

            /**
             * RGB to Hex
             */
            function rgb2hex(rgb) {
                if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

                rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                function hex(x) {
                    return ("0" + parseInt(x).toString(16)).slice(-2);
                }
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }

            /**
             * Add annotation to json
             */
            function add_annotation(shapeID, annoation) {
                annoation = Object.assign(annotation_blueprint,annoation);
                if( typeof s.annotation_data.annotations[shapeID] === 'undefined' ) {
                    s.annotation_data.annotations[shapeID] = annoation;
                } else {
                    if( typeof annoation.tooltip_data !== 'undefined' ) {
                        Object.assign(s.annotation_data.annotations[shapeID].tooltip_data ,annoation.tooltip_data);
                    }

                    if( typeof annoation.tooltip_settings !== 'undefined' ) {
                        Object.assign(s.annotation_data.annotations[shapeID].tooltip_settings ,annoation.tooltip_settings);
                    }
                    Object.assign(s.annotation_data.annotations[shapeID],annoation);
                }
            }

            /**
             * draw all annotations
             * @param annotations
             */
            function draw_annotations(annotation_data) {
                for( var i in annotation_data.annotations ) {
                    drawShape( i, annotation_data.annotations[i] )
                }
            }


            /**
             * For edit
             */
            function resetUI() {
                console.log(s.annotation_data.annotations);
                if( s.selected === 'edit' ) {
                    $('.js_shape')
                        .draggable({
                            containment: $(_this),
                            drag: function(ui,e){
                                var shape_id = $(this).attr('id');
                                modify_shape_data(shape_id,$(this));
                            }
                        })
                        .resizable({
                            containment: $(_this),
                            resize: function( ui, e ) {
                                var shape_id = $(this).attr('id');
                                modify_shape_data(shape_id, $(this) );

                            }
                        })
                } else {
                    if( $('.js_shape').draggable() && $('.js_shape').resizable() ) {
                        $('.js_shape').draggable('destroy').resizable('destroy');
                    }
                }

            }

            /**
             * Modify shape data
             */
            function modify_shape_data(shape_id, this_shape) {
                if( s.selected !== 'edit') return;
                if( typeof s.annotation_data.annotations[shape_id] !== 'undefined' ) {
                    var shape = s.annotation_data.annotations[shape_id].shape;
                    var left = parseInt($(this_shape).css('left'));
                    var left_ratio = (left/$(item).width())*100 + '%';
                    var top = parseInt($(this_shape).css('top'));
                    var top_ratio = (top/$(item).height())*100 + '%';
                    var width_ratio = ( $(this_shape).width()/$(item).width() ) * 100 + '%';
                    var height_ratio = ( $(this_shape).height()/$(item).height() ) * 100 + '%';

                    var annotation = {
                        shape: shape,
                        left: left_ratio,
                        top: top_ratio,
                        width: width_ratio,
                        height: height_ratio
                    };
                    add_annotation(shape_id,annotation);
                    createToolTip(shape_id,s.annotation_data.annotations[shape_id],true);
                }
            }

            /**
             *
             * @param shapeID
             * @param annotation
             */
            function changeShapeFromAnnotation(shapeID,annotation) {
                //change shape
                if( !shapeID ) return;
                $('#'+shapeID).removeClass('rect').removeClass('circle').addClass(annotation.shape);
            }

            /**
             * Draw shape from annotation
             */
            function drawShapeFromAnnotation(shapeID, data, reset) {
                if( reset !== 'undefined' || reset ) {
                    $('#' + shapeID).remove();
                }

                if( data.shape === 'rect' ) {
                    $('.ja_annotation_wrapper').append('<div id="'+ shapeID + '" class="js_shape rect" ' +
                        'style="position:absolute;opacity: 0.5; width: '+ data.width +'; height: '+ data.height +'; background: '+ data.tintColor +';"></div>');
                } else if( data.shape == 'circle' ) {
                    $('.ja_annotation_wrapper').append('<div id="'+ shapeID + '" class="js_shape circle" ' +
                        'style="position:absolute;opacity: 0.5; width: '+ data.width +'; height: '+ data.height +'; background: '+ data.tintColor +';"></div>');
                }

                var annotation = data;

                $('.js_shape').last()
                    .css({'left':annotation.left,
                        'top':annotation.top,
                        'width':annotation.width,
                        'height':annotation.height
                    });

                createToolTip(shapeID,annotation);
            }

            /**
             * Draw a shape
             */
            function drawShape(shapeID,data) {
                //date = {shape, pos, shapeWidth, shapeHeight} if edit
                //data = annotation_data.annotations[i] if preview
                if( s.selected === 'edit' ) {
                    if( data.shape == 'rect' ) {
                        $(annotation_wrapper).append('<div id="'+ shapeID + '" class="js_shape rect" style="position:absolute;opacity: 0.5; width: '+ data.width +'; height: '+ data.height +'; background: '+ data.tintColor +';"></div>');
                    }

                    var left = ( data.pos.x - img_position.left ) - $('.js_shape',_this).last().width()/2;
                    var left_ratio = (left/$(item).width())*100 + '%';
                    var top = ( $(window).scrollTop() + data.pos.y - img_position.top) - $('.js_shape',_this).last().height()/2;
                    var top_ratio = (top/$(item).height())*100 + '%';
                    var width_ratio = ( $('.js_shape',_this).last().width()/$(item).width() ) * 100 + '%';
                    var height_ratio = ( $('.js_shape',_this).last().height()/$(item).height() ) * 100 + '%';
                    var shape_id = $('.js_shape',_this).last().attr('id');

                    var annotation = {
                        shape: data.shape,
                        left: left_ratio,
                        top: top_ratio,
                        width: width_ratio,
                        height: height_ratio,
                        tooltip_data: {
                            title: 'Title',
                            content: 'Lorem Ipsum'
                        },
                        tooltip_settings: {
                            position: 'top', //top,right,bottom,left
                        }
                    };
                    //
                    add_annotation(shape_id,annotation);

                } else if ( s.selected === 'preview' ) {
                    var annotation = data;
                }


                $('.js_shape',_this).last()
                    .css({'left':annotation.left,
                        'top':annotation.top,
                        'width':annotation.width,
                        'height':annotation.height
                    });

                createToolTip(shape_id,annotation);
                resetUI();
            }

            /**
             * Create tooltip
             * @param shape_id
             * @param annotation
             */
            function createToolTip(shape_id, annotation, reset) {
                if( !shape_id ) return;
                if( typeof reset !== 'undefined' || reset ) {
                    $('.ja-annotation-box[data-target_shape="'+shape_id+'"]',_this).remove();
                }
                var tooltip_data = annotation.tooltip_data;
                var tooltip_settings = annotation.tooltip_settings;

                var tooltip_html =
                    '<div class="ja-annotation-box" data-target_shape="'+shape_id+'" style="width: auto; height: auto;position: absolute; color: #ffffff; ">' +
                    '<div class="ja-annotation-content">' +
                    '<h1>'+ tooltip_data.title +'</h1>' +
                    '<p>'+ tooltip_data.content +'</p>' +
                    '</div>' +
                    '<div class="js-annotation-arrow-down" style="top: 100%;">' +
                    '</div>' +
                    '</div>';
                $(annotation_wrapper).append(tooltip_html);

                var this_annotation_box = $('.ja-annotation-box[data-target_shape="'+shape_id+'"]',_this);
                $(this_annotation_box)
                    .css({top: parseInt( $('#'+shape_id).css('top') ) - $(this_annotation_box).outerHeight() - 10 + 'px' })
                    .css({left: parseInt( $('#'+shape_id).css('left') ) + ( $('#'+shape_id).width() / 2) - ( $(this_annotation_box).outerWidth()/ 2 ) + 'px'})
                    .hide();//hide initially
                ;

            }

            /**
             * Show tooltip
             * @param shape_id
             */
            function showShapeToolTip(shape_id) {
                $('.ja-annotation-box',_this).hide();
                if ( shape_id ) {
                    $('.ja-annotation-box[data-target_shape="'+shape_id+'"]',_this).show();
                }
            }

            function toggole_annotation_settings() {
                if ( !selectedShapeID ) {
                    $('input, select,textarea',s.settings_container).attr('disabled','disabled');
                } else {
                    $('input, select,textarea',s.settings_container).removeAttr('disabled');
                }
            }

            function selecteShape(selectedShapeID) {
                $('.js_shape',_this).removeClass('selectedShape')
                $('#'+selectedShapeID,_this).addClass('selectedShape');
            }

            function init_annotation_settings() {
                var annotation = {
                    tooltip_data: {},
                    tooltip_settings: {}
                };
                $('input, select, textarea',s.settings_container).change(function(){
                    annotation.shape = $(':input[name="shape"]').val();
                    annotation.tooltip_data['title'] = $(':input[name="tooltip_data[title]"]').val();
                    annotation.tooltip_data['content'] = $(':input[name="tooltip_data[content]"]').val();
                    annotation.tooltip_settings['text_color'] = $(':input[name="tooltip_settings[text_color]"]').val();
                    add_annotation(selectedShapeID,annotation);
                    changeShapeFromAnnotation(selectedShapeID,annotation);
                    createToolTip(selectedShapeID,annotation, true);
                });
            }

            /**
             * Populate options
             * in settings panel
             * @param shape_id
             */
            function populate_options(shape_id) {
                if( !shape_id ) return;
                var value = '';

                var annotation = s.annotation_data.annotations[shape_id];
                for( var m in s.mapper ) {
                    switch (m) {
                        case 'shape':
                            value = annotation.shape;
                            break;
                        case 'left':
                            value = annotation.left;
                            break;
                        case 'top':
                            value = annotation.top;
                            break;
                        case 'width':
                            value = annotation.width;
                            break;
                        case 'height':
                            value = annotation.height;
                            break;
                        case 'tooltip_title':
                            value = annotation.tooltip_data.title;
                            break;
                        case 'tooltip_content':
                            value = annotation.tooltip_data.content;
                            break;
                        case 'tooltip_text_color':
                            value = annotation.tooltip_settings.text_color;
                            break;
                    }
                    $('*[name="'+ s.mapper[m] +'"]').val(value);
                }
            }

            /**
             * Apply options to a shape
             * @param shape_id
             */
            function apply_options(shape_id) { return;
                if( !shape_id ) return;

                var annotation = s.annotation_data.annotations[shape_id];
                for( var m in s.mapper ) {
                    var value = $('*[name="'+ s.mapper[m] +'"]').val();
                    switch (m) {
                        case 'shape':
                            annotation.shape = value;
                            break;
                        case 'left':
                            if( value ) {
                                value = parseInt(value);
                                annotation.left = (value/$(item).width())*100 + '%';
                            }
                            break;
                        case 'top':
                            if( value ) {
                                value = parseInt(value);
                                annotation.top = (value/$(item).height())*100 + '%';
                            }
                            break;
                        case 'width':
                            if( value ){
                                value = parseInt(value);
                                annotation.width = ( value/$(item).width() ) * 100 + '%';
                            }
                            break;
                        case 'height':
                            if( value ) {
                                value = parseInt(value);
                                annotation.height = ( value/$(item).height() ) * 100 + '%';
                            }
                            break;
                        case 'tooltip_title':
                            annotation.tooltip_data.title = value;
                            break;
                        case 'tooltip_content':
                            annotation.tooltip_data.content = value;
                            break;
                        case 'tooltip_text_color':
                            annotation.tooltip_settings.text_color = value;
                            break;
                    }
                }
                s.annotation_data.annotations[shape_id] = Object.assign(s.annotation_data.annotations[shape_id], annotation);
            }

            function deleteAnnotation(shape_id) {
                if( s.selected !== 'edit' ) return;
                if( typeof s.annotation_data.annotations[shape_id] !== 'undefined' ) {
                    delete s.annotation_data.annotations[shape_id];
                }
                deleteShape(shape_id);
            }

            function deleteShape(shape_id) {
                if( s.selected !== 'edit' ) return;
                $('#'+shape_id,_this).remove();
                $('.ja-annotation-box[data-target_shape='+ shape_id +']',_this).remove();
            }

            function init() {
                if( s.selected === 'edit' ) {
                    $(_this).mousedown(function(e){
                        mousedown = true;
                        primX = e.clientX;
                        primY = e.clientY;
                    }).on('mousemove', item, function (e) {
                        if( mousedown ) {
                            dragging = true;
                            finalX = e.clientX;
                            finalY = e.clientY;

                        }
                    }).on('mouseup',function (e) {
                        if( mousedown ) {
                            mousedown = false;
                            dragging = false;
                        }
                    }).on('click',function (e) {
                        var shape_id = 'ja-' + ((new Date()).getTime());
                        var shapeData = {
                            shape: selectedShape,
                            pos: {x:e.clientX,y:e.clientY},
                            width: '50px',
                            height: '50px',
                            tintColor: tintColor
                        };
                        drawShape( shape_id, shapeData);
                        //apply_options(shape_id);
                    }).on('click','.js_shape',function (e) {
                        selectedShapeID = $(this).attr('id');
                        selecteShape(selectedShapeID);
                        populate_options(selectedShapeID);
                        showShapeToolTip(selectedShapeID);
                        e.stopPropagation();
                    }).on('mousedown','.js_shape',function (e) {
                        //e.stopPropagation();
                    }).on('mousemove','.js_shape',function (e) {
                        //e.stopPropagation();
                    }).on('mouseup','.js_shape',function (e) {
                        //e.stopPropagation();
                    }).on('click',s.deleteBtn,function(){
                    });

                    /**
                     * Delete annotation
                     */
                    $(s.deleteBtn).click(function(){
                        if( selectedShapeID ) {
                            deleteAnnotation(selectedShapeID);
                        }
                        return false;
                    });

                    init_annotation_settings();
                    //toggole_annotation_settings();
                    resetUI();
                } else if( s.selected === 'preview' ) {
                    draw_annotations(s.annotation_data);
                }
            }

            init();
        }); //return this

        return methods = {
            get_data : function() {
                return s.annotation_data;
            },
            changeMode: function (mode) {
                s.selected = mode;
                console.log(s.selected);
            }
        };
        //
    };

}( jQuery ));
