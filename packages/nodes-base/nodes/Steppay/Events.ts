const Events = [
    {
        name: '스텝샵 회원가입',
        value: "step.account.created.customer.normal",
        description: '스텝샵 고객 가입 이벤트'
    },
    {
        name: '주문 결제 완료',
        value: "step.product.commit.order",
        description: '주문 결제 완료 이벤트'
    },
    {
        name: '구독 생성',
        value: "step.product.subscription.created",
        description: '구독 생성 이벤트'
    },
    {
        name: '구독 갱신',
        value: "step.product.subscription.renewed",
        description: '구독 갱신 성공 이벤트'
    },
    {
        name: '구독 상태 변경',
        value: "step.product.subscription.changed",
        description: '구독 상태 변경 이벤트'
    },
    {
        name: '배송 시작',
        value: "step.delivery.started",
        description: '배송 시작 이벤트'
    },
	{
		name: '결제 미리 알림',
		value: 'step.product.notify.payment',
		description: '결제 미리 알림'
	}
]

export default Events
