/**
 * Contact Form 7 - Post Fields
 * Admin Tag Generator JavaScript
 *
 * Handles post type switching, taxonomy loading, value field toggling
 * and image size selection in the CF7 tag generator panels.
 */
(function($) {
    'use strict';

    /**
     * Helper: get the panel ID prefix from an element inside a tag generator dialog/panel.
     * Works with both CF7 6.x (<dialog>) and older CF7 (<div>).
     */
    function getPanelId(el) {
        var $dialog = $(el).closest('.tag-generator-dialog');

        if ($dialog.length) {
            return $dialog.attr('id');
        }

        // Fallback for older CF7 versions
        var $panel = $(el).closest('.control-box').parent();
        return $panel.attr('id');
    }

    // =========================================================================
    // Post Type Change → AJAX load taxonomies
    // =========================================================================
    $(document).on('change', 'input[type=radio][name=post-type]', function() {
        var panelId = getPanelId(this);

        if (!panelId) {
            return;
        }

        var postType = $(this).val();
        var $nameField = $('#' + panelId + '-name');
        var $taxFieldset = $('#' + panelId + '-post-taxonomies');

        // Empty taxonomy fieldset
        $taxFieldset.empty();

        // Trigger the change event
        $nameField.trigger('change');

        // Show loader
        $taxFieldset.html('<span class="spinner is-active" style="float:none;"></span>');

        // Ajax request to get all taxonomies from a post type
        $.ajax({
            url: wpcf7PostFieldsTagGen.ajaxUrl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'wpcf7_post_fields_get_taxonomies',
                security: wpcf7PostFieldsTagGen.nonce,
                post_type: postType
            },
            success: function(result) {
                $taxFieldset.empty();

                if (result.success === true) {
                    var countTax = 0;

                    $.each(result.data, function(key, value) {
                        var $taxField = $('<input type="text" value="">')
                            .attr('class', 'oneline option')
                            .attr('name', key)
                            .attr('placeholder', value);

                        // Append the text field to the taxonomy fieldset
                        $taxFieldset.append($taxField).append('<br />');

                        // Trigger the change event from the contact form 7 base
                        $taxField.change(function() {
                            $nameField.trigger('change');
                        });

                        countTax++;
                    });

                    // Categories found
                    if (countTax > 0) {
                        // Add Relationship radios
                        $taxFieldset.append(wpcf7PostFieldsTagGen.i18n.relationship + ': ');
                        $taxFieldset.append(
                            $('<label>').append(
                                $('<input type="radio">')
                                    .attr('name', 'tax-relation')
                                    .attr('class', 'option')
                                    .attr('value', 'OR')
                                    .attr('checked', 'checked')
                            ).append('OR')
                        );
                        $taxFieldset.append('&nbsp;');
                        $taxFieldset.append(
                            $('<label>').append(
                                $('<input type="radio">')
                                    .attr('name', 'tax-relation')
                                    .attr('class', 'option')
                                    .attr('value', 'AND')
                            ).append('AND')
                        );

                        // Register the change event
                        $taxFieldset.find("input[name='tax-relation']").change(function() {
                            $nameField.trigger('change');
                        });

                        // Trigger the change event now to set the tax-relation
                        $nameField.trigger('change');
                    } else {
                        $taxFieldset.html(wpcf7PostFieldsTagGen.i18n.noCategoriesFound);
                    }
                } else {
                    alert(result.data);
                }
            },
            error: function() {
                $taxFieldset.html(wpcf7PostFieldsTagGen.i18n.unknownError);
            }
        });
    });

    // =========================================================================
    // Value Field Change → show/hide meta key input
    // =========================================================================
    $(document).on('change', 'input[type=radio][name=value-field]', function() {
        var panelId = getPanelId(this);

        if (!panelId) {
            return;
        }

        var valueField = $(this).val();
        var $nameField = $('#' + panelId + '-name');
        var $metaKeyField = $('#' + panelId + '-value-field-meta-key');

        if (valueField === 'meta') {
            $metaKeyField.show();
        } else {
            $metaKeyField.hide().val('').trigger('change');
        }
    });

    // =========================================================================
    // Image Size Radio Change → show/hide custom size inputs, update hidden field
    // =========================================================================
    $(document).on('change', 'input[type=radio][name=size-name]', function() {
        var panelId = getPanelId(this);

        if (!panelId) {
            return;
        }

        var imageSizeName = $(this).val();
        var $nameField = $('#' + panelId + '-name');
        var $imageSizeField = $('#' + panelId + '-image-size input[type=hidden][name=image-size]');
        var $customSize = $('.' + panelId + '-custom-image-size');
        var $widthField = $('#' + panelId + '-image-width');
        var $heightField = $('#' + panelId + '-image-height');

        if (imageSizeName === 'custom') {
            $customSize.show();
            setCustomImageSize($widthField, $heightField, $nameField, $imageSizeField);
        } else {
            $customSize.hide();
            $imageSizeField.val(imageSizeName);
        }

        // Trigger the change event
        $nameField.trigger('change');
    });

    // =========================================================================
    // Custom Image Width/Height Change → update hidden image-size field
    // =========================================================================
    $(document).on('change', 'input[name=image-width], input[name=image-height]', function() {
        var panelId = getPanelId(this);

        if (!panelId) {
            return;
        }

        var $nameField = $('#' + panelId + '-name');
        var $imageSizeField = $('#' + panelId + '-image-size input[type=hidden][name=image-size]');
        var $widthField = $('#' + panelId + '-image-width');
        var $heightField = $('#' + panelId + '-image-height');

        setCustomImageSize($widthField, $heightField, $nameField, $imageSizeField);
    });

    /**
     * Set the custom image size value from width and height fields.
     */
    function setCustomImageSize($widthField, $heightField, $nameField, $imageSizeField) {
        var w = $widthField.val();
        var h = $heightField.val();

        if ($.isNumeric(w) && $.isNumeric(h)) {
            $imageSizeField.val(w + 'x' + h);
        }

        $nameField.trigger('change');
    }

    // =========================================================================
    // Initialize: hide custom image size fields and handle page refresh state
    // =========================================================================
    $(function() {
        // Hide all custom image size containers on page load
        $('[class*="-custom-image-size"]').hide();

        // If a custom size was previously selected (page refresh), show the fields
        $('input[type=radio][name=size-name]:checked').each(function() {
            if ($(this).val() === 'custom') {
                var panelId = getPanelId(this);

                if (panelId) {
                    var $nameField = $('#' + panelId + '-name');
                    var $imageSizeField = $('#' + panelId + '-image-size input[type=hidden][name=image-size]');
                    var $customSize = $('.' + panelId + '-custom-image-size');
                    var $widthField = $('#' + panelId + '-image-width');
                    var $heightField = $('#' + panelId + '-image-height');

                    $customSize.show();
                    setCustomImageSize($widthField, $heightField, $nameField, $imageSizeField);
                }
            }
        });
    });

})(jQuery);
