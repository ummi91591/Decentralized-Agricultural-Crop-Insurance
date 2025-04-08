;; farm-registry.clar
;; This contract handles farm registration and stores farm details

(define-data-var last-farm-id uint u0)

;; Data structure for farm information
(define-map farms
  { farm-id: uint }
  {
    owner: principal,
    location: (string-utf8 100),
    crop-type: (string-utf8 50),
    area: uint,
    registered-at: uint
  }
)

;; Register a new farm
(define-public (register-farm (location (string-utf8 100)) (crop-type (string-utf8 50)) (area uint))
  (let
    (
      (new-farm-id (+ (var-get last-farm-id) u1))
    )
    (begin
      (var-set last-farm-id new-farm-id)
      (map-set farms
        { farm-id: new-farm-id }
        {
          owner: tx-sender,
          location: location,
          crop-type: crop-type,
          area: area,
          registered-at: block-height
        }
      )
      (ok new-farm-id)
    )
  )
)

;; Get farm details
(define-read-only (get-farm (farm-id uint))
  (map-get? farms { farm-id: farm-id })
)

;; Check if caller is the farm owner
(define-read-only (is-farm-owner (farm-id uint) (caller principal))
  (let ((farm-data (map-get? farms { farm-id: farm-id })))
    (if (is-some farm-data)
      (is-eq (get owner (unwrap-panic farm-data)) caller)
      false
    )
  )
)

;; Update farm details
(define-public (update-farm-details (farm-id uint) (crop-type (string-utf8 50)) (area uint))
  (let ((farm-data (map-get? farms { farm-id: farm-id })))
    (if (and
          (is-some farm-data)
          (is-eq (get owner (unwrap-panic farm-data)) tx-sender))
      (begin
        (map-set farms
          { farm-id: farm-id }
          (merge (unwrap-panic farm-data)
            {
              crop-type: crop-type,
              area: area
            }
          )
        )
        (ok true)
      )
      (err u1) ;; Not authorized or farm doesn't exist
    )
  )
)
