<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

namespace Colorpack\Plugin\Editors\Editorjs\Provider;

\defined('_JEXEC') or die;

use Colorpack\Plugin\Editors\Editorjs\Helper\EditorRenderer;
use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Editor\AbstractEditorProvider;
use Joomla\Event\DispatcherInterface;
use Joomla\Registry\Registry;

final class EditorjsProvider extends AbstractEditorProvider
{
	public function __construct(
		private Registry $params,
		private CMSApplicationInterface $application,
		DispatcherInterface $dispatcher
	) {
		$this->setDispatcher($dispatcher);
	}

	public function getName(): string
	{
		return 'editorjs';
	}

	public function display(string $name, string $content = '', array $attributes = [], array $params = []): string
	{
		$id = ($attributes['id'] ?? '') ?: $name;

		return EditorRenderer::render(
			$this->application,
			$this->params,
			$name,
			$content,
			$id,
			$attributes['height'] ?? '',
			!empty($params['readonly']),
			$this->displayButtons(
				$params['buttons'] ?? true,
				['asset' => $params['asset'] ?? 0, 'author' => $params['author'] ?? 0, 'editorId' => $id]
			)
		);
	}
}
