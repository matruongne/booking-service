const allocateSeatsWithNoLonelySeats = (availableSeats, requestedSeats, selectedSeats = null) => {
	// Sắp xếp danh sách ghế
	availableSeats.sort((a, b) => {
		const rowA = a.seat_code[0]
		const rowB = b.seat_code[0]
		const colA = parseInt(a.seat_code.slice(1))
		const colB = parseInt(b.seat_code.slice(1))
		return rowA === rowB ? colA - colB : rowA.localeCompare(rowB)
	})

	// Kiểm tra ghế lẻ xung quanh
	const createsLonelySeats = (selectedSeats, allSeats) => {
		const seatCodes = allSeats.map(seat => seat.seat_code)
		selectedSeats.sort((a, b) => {
			const rowA = a.seat_code[0]
			const rowB = b.seat_code[0]
			const colA = parseInt(a.seat_code.slice(1))
			const colB = parseInt(b.seat_code.slice(1))
			return rowA === rowB ? colA - colB : rowA.localeCompare(rowB)
		})

		for (let seat of selectedSeats) {
			const row = seat.seat_code[0]
			const col = parseInt(seat.seat_code.slice(1))

			const leftSeat = `${row}${col - 1}`
			const rightSeat = `${row}${col + 1}`

			const isLeftLonely =
				seatCodes.includes(leftSeat) &&
				!selectedSeats.some(s => s.seat_code === leftSeat) &&
				!seatCodes.includes(`${row}${col - 2}`)
			const isRightLonely =
				seatCodes.includes(rightSeat) &&
				!selectedSeats.some(s => s.seat_code === rightSeat) &&
				!seatCodes.includes(`${row}${col + 2}`)

			if (isLeftLonely || isRightLonely) {
				return true
			}
		}

		return false
	}

	// Trường hợp khách chọn ghế cụ thể
	if (selectedSeats) {
		if (createsLonelySeats(selectedSeats, availableSeats)) {
			return { success: false, message: 'Ghế được chọn sẽ tạo ra ghế lẻ, vui lòng chọn lại.' }
		}

		// Đặt ghế nếu tất cả ghế hợp lệ
		return { success: true, seats: selectedSeats }
	}

	// Tự động phân bổ ghế (ưu tiên ghế liên tiếp)
	let allocatedSeats = []
	let tempCluster = []
	let currentRow = availableSeats[0].seat_code[0]

	for (let i = 0; i < availableSeats.length; i++) {
		const currentSeat = availableSeats[i]
		const row = currentSeat.seat_code[0]
		const col = parseInt(currentSeat.seat_code.slice(1))

		// Nếu chuyển sang hàng mới hoặc reset cụm ghế
		if (row !== currentRow) {
			currentRow = row
			tempCluster = []
		}

		// Thêm ghế vào cụm
		tempCluster.push(currentSeat)

		// Nếu cụm ghế đủ số lượng yêu cầu
		if (tempCluster.length === requestedSeats) {
			allocatedSeats = [...tempCluster]
			break
		}

		// Nếu cụm ghế không liên tiếp, reset lại cụm ghế
		if (tempCluster.length > 1) {
			const lastSeat = tempCluster[tempCluster.length - 2]
			const lastCol = parseInt(lastSeat.seat_code.slice(1))

			if (col !== lastCol + 1) {
				tempCluster = [currentSeat]
			}
		}
	}

	// Nếu không đủ ghế trong một hàng, bổ sung từ các hàng tiếp theo
	if (allocatedSeats.length < requestedSeats) {
		let remainingSeats = requestedSeats - allocatedSeats.length

		for (let i = 0; i < availableSeats.length; i++) {
			const currentSeat = availableSeats[i]
			if (!allocatedSeats.includes(currentSeat)) {
				allocatedSeats.push(currentSeat)
				remainingSeats--
				if (remainingSeats === 0) break
			}
		}
	}

	return allocatedSeats.length === requestedSeats
		? { success: true, seats: allocatedSeats }
		: { success: false, message: 'Không tìm thấy cụm ghế phù hợp.' }
}

module.exports = allocateSeatsWithNoLonelySeats
