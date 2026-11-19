    status ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'CONFIRMED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at DATETIME NULL,
    PRIMARY KEY (reservation_id),
    KEY idx_reservations_room_time_status (room_id, status, start_at, end_at),
    KEY idx_reservations_user_created (user_id, created_at),
    CONSTRAINT fk_reservations_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_reservations_room
        FOREIGN KEY (room_id) REFERENCES study_rooms(room_id),
    CONSTRAINT chk_reservation_time CHECK (end_at > start_at),
    CONSTRAINT chk_reservation_points CHECK (points_used >= 0)
) ENGINE=InnoDB;

-- 7. 포인트 거래 내역
-- 충전/예약 차감/예약 취소 환불을 모두 기록한다.
-- 포인트 잔액은 거래 내역의 SUM(amount)로 계산할 수 있다.
-- amount: 충전 및 환불은 양수, 사용은 음수.
CREATE TABLE point_transactions (
    transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    reservation_id BIGINT UNSIGNED NULL,
    transaction_type ENUM('CHARGE', 'USE', 'REFUND', 'ADJUSTMENT') NOT NULL,
    amount INT NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id),
    KEY idx_point_transactions_user_date (user_id, created_at),
    KEY idx_point_transactions_reservation (reservation_id),
    CONSTRAINT fk_point_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_point_transactions_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
    CONSTRAINT chk_point_transaction_amount CHECK (
        (transaction_type = 'USE' AND amount < 0)
        OR (transaction_type IN ('CHARGE', 'REFUND') AND amount > 0)
        OR (transaction_type = 'ADJUSTMENT' AND amount <> 0)
    )
) ENGINE=InnoDB;

-- -------------------------
-- Sample data
-- -------------------------

INSERT INTO users (email, password_hash, nickname) VALUES
('yeji@example.com', '$2b$12$sample_hash_replace_with_real_hash', '예지'),
('minsu@example.com', '$2b$12$sample_hash_replace_with_real_hash', '민수');

INSERT INTO study_cafes
(cafe_name, address, road_address, latitude, longitude, phone, opening_time, closing_time)
VALUES
('몰입스터디 신림점', '서울특별시 관악구 신림동 000', '서울특별시 관악구 신림로 00', 37.4842000, 126.9290000, '02-000-0000', '08:00:00', '23:00:00'),
('공간스터디 봉천점', '서울특별시 관악구 봉천동 000', '서울특별시 관악구 남부순환로 00', 37.4828000, 126.9410000, '02-111-1111', '09:00:00', '22:00:00');

INSERT INTO study_rooms (cafe_id, room_name, capacity, points_per_hour, description) VALUES
(1, 'A룸', 4, 100, '소규모 그룹 스터디룸'),
(1, 'B룸', 6, 140, '모니터가 있는 그룹 스터디룸'),
(2, '세미나룸', 8, 180, '대규모 회의 및 스터디룸');

INSERT INTO facilities (facility_name) VALUES
('화이트보드'), ('모니터'), ('콘센트'), ('대형 테이블');

INSERT INTO room_facilities (room_id, facility_id) VALUES
(1, 1), (1, 3), (2, 1), (2, 2), (2, 3), (3, 1), (3, 2), (3, 4);

-- 예시 예약: 실제 서비스에서는 예약 시각과 포인트 정책에 맞게 생성
INSERT INTO reservations
(user_id, room_id, start_at, end_at, points_used, status)
VALUES
(1, 1, '2026-11-10 14:00:00', '2026-11-10 16:00:00', 200, 'CONFIRMED'),
(2, 2, '2026-11-10 15:00:00', '2026-11-10 16:00:00', 140, 'CONFIRMED');

INSERT INTO point_transactions
(user_id, reservation_id, transaction_type, amount, description)
VALUES
(1, NULL, 'CHARGE', 1000, '초기 포인트 충전 예시'),
(1, 1, 'USE', -200, 'A룸 예약 포인트 차감'),
(2, NULL, 'CHARGE', 1000, '초기 포인트 충전 예시'),
(2, 2, 'USE', -140, 'B룸 예약 포인트 차감');

-- -------------------------
-- Useful queries for the application
-- -------------------------

-- 사용자별 현재 포인트 잔액
SELECT user_id, COALESCE(SUM(amount), 0) AS point_balance
FROM point_transactions
WHERE user_id = 1
GROUP BY user_id;

-- 지도에 표시할 스터디카페 및 스터디룸 보유 여부
SELECT c.cafe_id, c.cafe_name, c.latitude, c.longitude,
       COUNT(r.room_id) AS room_count
FROM study_cafes c
LEFT JOIN study_rooms r
  ON r.cafe_id = c.cafe_id AND r.is_active = TRUE
GROUP BY c.cafe_id, c.cafe_name, c.latitude, c.longitude;

-- 특정 룸의 선택 시간대와 겹치는 예약 확인
SELECT reservation_id
FROM reservations
WHERE room_id = 1
  AND status = 'CONFIRMED'
  AND start_at < '2026-11-10 16:00:00'
  AND end_at > '2026-11-10 14:00:00';

-- 인기 스터디룸: 기간 내 예약 건수 기준 예시
-- 실제 기획의 '전체 평균 이용률 대비 예약률'을 계산하려면
-- 영업 가능 시간 등 이용률의 분모 기준을 먼저 정의해야 한다.
SELECT r.room_id, r.room_name, c.cafe_name,
       COUNT(res.reservation_id) AS reservation_count
FROM study_rooms r
JOIN study_cafes c ON c.cafe_id = r.cafe_id
LEFT JOIN reservations res
  ON res.room_id = r.room_id
 AND res.status IN ('CONFIRMED', 'COMPLETED')
 AND res.start_at >= '2026-11-01 00:00:00'
 AND res.start_at <  '2026-12-01 00:00:00'
GROUP BY r.room_id, r.room_name, c.cafe_name
ORDER BY reservation_count DESC;
