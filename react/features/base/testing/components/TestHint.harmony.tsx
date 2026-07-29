import React, { Component } from 'react';
import { Text } from 'react-native';
import { connect } from 'react-redux';

import { TestHintProps, _mapStateToProps } from './AbstractTestHint';

/**
 * The HarmonyOS version of <code>TestHint</code>. It mirrors the Android
 * implementation and puts the identifier as the 'accessibilityLabel'.
 *
 * @see TestHint.android for the rationale of using 'accessibilityLabel'
 * instead of 'testID'.
 */
class TestHint extends Component<TestHintProps> {

    /**
     * Renders the test hint on HarmonyOS.
     *
     * @returns {ReactElement}
     */
    override render() {
        if (!this.props._testModeEnabled) {
            return null;
        }

        return (
            <Text
                accessibilityLabel = { this.props.id }
                onPress = { this.props.onPress } >
                { this.props.value }
            </Text>
        );
    }
}

export default connect(_mapStateToProps)(TestHint);
