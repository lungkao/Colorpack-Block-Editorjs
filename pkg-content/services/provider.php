<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

\defined('_JEXEC') or die;

use Colorpack\Plugin\Content\Colorpackembed\Extension\Colorpackembed;
use Joomla\CMS\Extension\PluginInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;
use Joomla\Event\DispatcherInterface;

return new class implements ServiceProviderInterface {
	public function register(Container $container)
	{
		$container->set(
			PluginInterface::class,
			function (Container $container) {
				$config     = (array) PluginHelper::getPlugin('content', 'colorpackembed');
				$dispatcher = $container->get(DispatcherInterface::class);
				$plugin     = version_compare(JVERSION, '5.4', '>=')
					? new Colorpackembed($config)
					: new Colorpackembed($dispatcher, $config);
				$plugin->setDispatcher($dispatcher);
				$plugin->setApplication(Factory::getApplication());

				return $plugin;
			}
		);
	}
};
