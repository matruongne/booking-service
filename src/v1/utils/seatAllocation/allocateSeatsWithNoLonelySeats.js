function allocateSeatsWithNoLonelySeats(availableSeats, requestedSeats, selectedSeats = null) {
	// Kiểm tra ghế lẻ xung quanh (dành cho trường hợp khách chọn ghế cụ thể)
	function createsLonelySeats(selectedSeats, allSeats) {
		// Sắp xếp ghế theo hàng và cột để xử lý dễ hơn
		selectedSeats.sort((a, b) => {
			const rowA = a[0]
			const rowB = b[0]
			const colA = parseInt(a.slice(1))
			const colB = parseInt(b.slice(1))
			return rowA === rowB ? colA - colB : rowA.localeCompare(rowB)
		})

		for (let seat of selectedSeats) {
			const row = seat[0]
			const col = parseInt(seat.slice(1))

			const leftSeat = `${row}${col - 1}`
			const rightSeat = `${row}${col + 1}`

			const isLeftLonely =
				allSeats.includes(leftSeat) &&
				!selectedSeats.includes(leftSeat) &&
				!allSeats.includes(`${row}${col - 2}`)
			const isRightLonely =
				allSeats.includes(rightSeat) &&
				!selectedSeats.includes(rightSeat) &&
				!allSeats.includes(`${row}${col + 2}`)

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

	// Tự động phân bổ ghế (không chọn trung tâm, ưu tiên ghế liên tiếp)
	let allocatedSeats = []
	let tempCluster = []
	let currentRow = availableSeats[0][0]

	for (let i = 0; i < availableSeats.length; i++) {
		const currentSeat = availableSeats[i]
		const row = currentSeat[0]
		const col = parseInt(currentSeat.slice(1))

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
			const lastCol = parseInt(lastSeat.slice(1))

			if (col !== lastCol + 1) {
				tempCluster = [currentSeat]
			}
		}
	}

	// Nếu không đủ ghế trong một hàng, bổ sung ghế từ hàng tiếp theo
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
