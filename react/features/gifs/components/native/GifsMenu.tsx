// import { GiphyContent, GiphyGridView, GiphyMediaType, GiphyRating } from '@giphy/react-native-sdk';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { View } from 'react-native';

import { createGifSentEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import JitsiScreen from '../../../base/modal/components/JitsiScreen';
import Input from '../../../base/ui/components/native/Input';
import { sendMessage } from '../../../chat/actions.any';
import { goBack } from '../../../mobile/navigation/components/conference/ConferenceNavigationContainerRef';
import { formatGifUrlMessage, getGifRating, getGifUrl } from '../../functions.native';

import GifsMenuFooter from './GifsMenuFooter';
import styles from './styles';

// --- 空实现，替代 @giphy/react-native-sdk ---
enum GiphyMediaType {
    Gif = 'gif'
}

enum GiphyRating {
    PG = 'pg'
}

const GiphyContent = {
    trending: (_options: any) => ({}),
    search: (_options: any) => ({})
};

const GiphyGridView = (_props: any) => null;
// --- 空实现结束 ---

const GifsMenu = () => {
    const [ searchQuery, setSearchQuery ] = useState('');
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const rating = useSelector(getGifRating) as GiphyRating;
    const options = {
        mediaType: GiphyMediaType.Gif,
        limit: 20,
        rating
    };

    const content = searchQuery === ''
        ? GiphyContent.trending(options)
        : GiphyContent.search({
            ...options,
            searchQuery
        });

    const sendGif = useCallback(e => {
        const url = getGifUrl(e.nativeEvent.media);

        sendAnalytics(createGifSentEvent());

        dispatch(sendMessage(formatGifUrlMessage(url), true));
        goBack();
    }, []);

    return (
        <JitsiScreen
            footerComponent = { GifsMenuFooter }
            style = { styles.container }>
            <Input
                clearable = { true }
                customStyles = {{ container: styles.customContainer }}
                onChange = { setSearchQuery }
                placeholder = { t('giphy.search') }
                value = { searchQuery } />
            <GiphyGridView
                cellPadding = { 5 }
                content = { content }
                onMediaSelect = { sendGif }
                style = { styles.grid } />
        </JitsiScreen>
    );
};

export default GifsMenu;