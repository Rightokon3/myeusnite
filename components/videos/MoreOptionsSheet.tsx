
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  isOwner: boolean;
}

export default function MoreOptionsSheet({ visible, onClose, videoId, isOwner }: Props) {
  const handleDelete = () => {
    onClose();
    Alert.alert('Delete video?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteDoc(doc(db, 'videos', videoId)).catch(() => {}),
      },
    ]);
  };

  const options = [
    { icon: 'bookmark-outline' as const, label: 'Save video', onPress: onClose },
    { icon: 'link-outline' as const, label: 'Copy link', onPress: onClose },
    { icon: 'eye-off-outline' as const, label: 'Not interested', onPress: onClose },
    { icon: 'flag-outline' as const, label: 'Report', onPress: onClose, danger: true },
    ...(isOwner ? [{ icon: 'trash-outline' as const, label: 'Delete video', onPress: handleDelete, danger: true }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, paddingBottom: SPACING.xl }}>
          <View style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
          </View>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.label}
              onPress={opt.onPress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 14, paddingHorizontal: SPACING.lg }}>
              <Ionicons name={opt.icon} size={20} color={opt.danger ? COLORS.primaryRed : COLORS.textDark} />
              <Text style={{ fontSize: FONT_SIZE.body, color: opt.danger ? COLORS.primaryRed : COLORS.textDark, fontWeight: FONT_WEIGHT.medium }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}